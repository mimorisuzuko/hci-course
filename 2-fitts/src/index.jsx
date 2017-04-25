require('./index.scss');

const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('lodash');
const { Component } = React;

const TRIAL = 5;
const DISTANCE_LIST = [256, 384, 512];
const WIDTH_LIST = [32, 64, 96];

/**
 * @param {number[][]} data 
 */
const reg = (data) => {
	const { length } = data;
	let avgX = 0;
	let avgY = 0;

	_.forEach(data, ([x, y]) => {
		avgX += x / length;
		avgY += y / length;
	});

	let c = 0;
	let stdvX = 0;
	let stdvY = 0;

	_.forEach(data, ([x, y]) => {
		const dx = (x - avgX);
		const dy = (y - avgY);

		c += dx * dy;
		stdvX += Math.pow(dx, 2);
		stdvY += Math.pow(dy, 2);
	});

	stdvX = Math.sqrt(stdvX);
	stdvY = Math.sqrt(stdvY);

	const r = c / (stdvX * stdvY);
	const slope = r * (stdvY / stdvX);
	const intercept = avgY - (slope * avgX);

	return { r, slope, intercept };
};

/**
 * @param {number[][]} data 
 * @param {Object} options 
 */
const graph = (data, options = {}) => {
	const { xLabel, yLabel, width, height, pad } = _.merge({ xLabel: 'x values', yLabel: 'y values', width: 400, height: 400, pad: 70 }, options);
	const innerWidth = width - pad * 2;
	const innerHeight = height - pad * 2;
	let maxX = 0;
	let maxY = 0;
	let minX = Infinity;

	_.forEach(data, ([x, y]) => {
		minX = Math.min(x, minX);
		maxX = Math.max(x, maxX);
		maxY = Math.max(y, maxY);
	});

	[maxX, maxY] = _.map([maxX, maxY], (a) => {
		const { length } = String(_.floor(a));

		if (length === 1) {
			return a;
		}

		return _.ceil(a, -(length - 2));
	});

	const dx = innerWidth / maxX;
	const dy = innerHeight / maxY;
	const points = _.map(data, ([x, y]) => <circle cx={pad + dx * x} cy={pad + (innerHeight - dy * y)} r={3} fill='rgb(0, 122, 204)' />);
	const { r, slope, intercept } = reg(data);

	return (
		<svg style={{ width, height }}>
			<rect x={pad} y={pad} width={1} height={innerHeight} fill={'gray'} />
			<rect x={pad} y={pad + innerHeight} width={innerWidth} height={1} fill={'gray'} />
			<g fontSize={12}>
				<text x={pad + innerWidth} y={pad + innerHeight - 5} fill='black' textAnchor='end'>{xLabel}</text>
				<text x={pad + 3} y={pad + 14} fill='black'>{yLabel}</text>
				<text x={pad + innerWidth} y={pad + innerHeight + 17} fill='black' textAnchor='end'>{maxX.toFixed(2)}</text>
				<text x={pad - 3} y={pad + 14} fill='black' textAnchor='end'>{maxY.toFixed(2)}</text>
				<text x={pad + innerWidth} textAnchor='end' y={pad}>MT = {intercept.toFixed(2)} + {slope.toFixed(2)}ID</text>
				<text x={pad + innerWidth} textAnchor='end' y={pad + 17}>R^2 = {Math.pow(r, 2).toFixed(2)}</text>
			</g>
			<line
				x1={pad + minX * dx}
				y1={pad + (innerHeight - dy * (slope * minX + intercept))}
				x2={pad + maxX * dx}
				y2={pad + (innerHeight - dy * (slope * maxX + intercept))}
				stroke='rgb(0, 122, 204)'
				strokeDasharray='5, 5'
			/>
			{points}
		</svg>
	);
};

class App extends Component {
	constructor(props) {
		super(props);

		/** @type {number[][]} */
		const conditions = [];
		for (let i = 0; i < TRIAL; i += 1) {
			_.forEach(_.shuffle(DISTANCE_LIST), (d) => _.forEach(_.shuffle(WIDTH_LIST), (w) => {
				conditions.push([d, w]);
			}));
		}

		const current = conditions.pop();

		this.scores = {};
		this.conditions = conditions;
		this.startTime = 0;
		this.state = { current, end: false, width: 0, height: 0, started: false };
		this.onStart = this.onStart.bind(this);
		this.onEnd = this.onEnd.bind(this);
	}

	render() {
		const { state: { current: [d, w], end, started, width, height }, scores } = this;
		const panel = end ? graph(_.toPairs(scores), { xLabel: 'ID [bits]', yLabel: 'MT [ms]', width, height }) : [
			<div style={{ position: 'absolute', left: 10, top: 10 }}>
				<div>W: {w}</div>
				<div>D: {d}</div>
			</div>
			,
			<div onClick={this.onStart} style={{
				position: 'absolute',
				left: `calc(50% + ${-w / 2 - d / 2}px)`,
				top: 0,
				backgroundColor: started ? 'blue' : 'gray',
				width: w,
				height: '100%'
			}} />
			,
			<div onClick={this.onEnd} style={{
				position: 'absolute',
				left: `calc(50% + ${-w / 2 + d / 2}px)`,
				top: 0,
				backgroundColor: 'green',
				width: w,
				height: '100%'
			}} />
		];

		return (
			<div style={{
				width: '100%',
				height: '100%',
				position: 'relative'
			}}>
				{panel}
			</div>
		);
	}

	onStart() {
		this.startTime = Date.now();
		this.setState({ started: true });
	}

	onEnd() {
		const { state: { current, started } } = this;
		if (!started) { return; }

		const id = Math.log2(current[0] / current[1] + 1);

		if (_.has(this.scores, id)) {
			this.scores[id] += (Date.now() - this.startTime) / TRIAL;
		} else {
			this.scores[id] = (Date.now() - this.startTime) / TRIAL;
		}

		const next = this.conditions.pop();

		if (next) {
			this.setState({ current: next, started: false });
		} else {
			const { width, height } = ReactDOM.findDOMNode(this).getBoundingClientRect();

			this.setState({ end: true, width, height });
		}
	}
}

ReactDOM.render(<App />, document.querySelector('main'));