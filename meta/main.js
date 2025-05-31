import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    return data;
  }

let xScale = d3.scaleTime();
let yScale = d3.scaleLinear();
function processCommits(data) {
return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;
    let ret = {
        id: commit,
        url: 'https://github.com/Haruncodes/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
    };

    Object.defineProperty(ret, 'lines', {
        value: lines,
        writable:  true,
        enumerable: true, 
        configurable: true
        // What other options do we need to set?
        // Hint: look up configurable, writable, and enumerable
    });

    return ret;
    });
}

function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
    
    let maxLineLength = 0;
    let sumLineLength = 0;
    const days = {};
    const files = d3.group(data, d => d.file).size
    const fileLengths = d3.rollups(
        data,
        (v) => d3.max(v, (v) => v.line),
        (d) => d.file,
      );
    const averageFileLength = d3.mean(fileLengths, (d) => d[1]);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const commit of commits){
        if (commit.lines.length > maxLineLength){
            maxLineLength = commit.lines.length;
            sumLineLength += commit.lines.length;
        }
        // Add day of week
        const day = commit.date.getDay();
        if (days[day] == null){
            days[day] = 1;
        } else {
            days[day]++;
        }
    }
    // Add total files
    dl.append('dt').text('Number of files');
    dl.append('dd').text(files);

    // add longest line
    dl.append('dt').text('Longest Line Length');
    dl.append('dd').text(maxLineLength);

    // add average file length
    dl.append('dt').text('Average File Length');
    dl.append('dd').text(averageFileLength);

    // add day of week that most work is done
    dl.append('dt').text('Most Productive Day of Week');
    // get the day with maximum value
    dl.append('dd').text(dayNames[days[Math.max(...Object.values(days))]]);
}
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const author = document.getElementById('commit-author');
    const time = document.getElementById('commit-time');
    const lines = document.getElementById('commit-lines');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
    author.textContent = commit.author;
    time.textContent = commit.time + ' ' + commit.timezone;
    lines.textContent = commit.lines.length;
  }

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }
    const [x0, x1] = selection.map((d) => d[0]); 
    const [y0, y1] = selection.map((d) => d[1]); 
    const x = xScale(commit.datetime); 
    const y = yScale(commit.hourFrac); 
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}


function renderScatterPlot(data, commits) {
    // Put all the JS code of Steps inside this function
    const width = 1000;
    const height = 600;
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]); // adjust these values based on your experimentation
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
    
    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
      
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Add gridlines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Create gridlines as an axis with no labels and full-width ticks
    // to-do: css to make grid less prominent/visible, color each line based on nighttime and daytime
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis') // new line to mark the g tag
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis') // just for consistency
    .call(yAxis);

    const dots = svg.append('g').attr('class', 'dots');

    dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id) // change this line
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);

    })
    .on('mouseleave', () => {
        // TODO: Hide the tooltip
        updateTooltipVisibility(false);
    });
      
    svg.call(d3.brush().on('start brush end', (event) => brushed(event, commits)));
    svg.selectAll('.dots, .overlay ~ *').raise();
    
   }

  function updateScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart').select('svg');

    xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    const xAxis = d3.axisBottom(xScale);

    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    dots
      .selectAll('circle')
      .data(sortedCommits, (d) => d.id) // change this line
      .join('circle')
      .attr('cx', (d) => xScale(d.datetime))
      .attr('cy', (d) => yScale(d.hourFrac))
      .attr('r', (d) => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7) // Add transparency for overlapping dots
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });
}

let data = await loadData();

let commits = processCommits(data);
// console.log(commits);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

let filteredCommits = commits;

// after initializing filteredCommits
let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  });

// Event handler for the time slider
function onTimeSliderChange(){
  const options = {
    dateStyle: 'long',
    timeStyle: 'short',
  }
  // Update the commit progress based on the slider value
  commitProgress = document.getElementById('commit-progress').value;
  // Update the commit max time based on the time scale
  commitMaxTime = timeScale.invert(commitProgress);
  // Update the tooltip and commit time display
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString("en-US", options);

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  // remove previous commit stats and replace with new ones
  d3.select('#stats').selectAll('dl.stats').remove();
  renderCommitInfo(data, filteredCommits);
  updateScatterPlot(data, filteredCommits);
}
// Add event listener for the time slider
document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);