require('./index.scss');

const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('lodash');
const { Component } = React;

const TRIAL = 5;
const AMPLITUDE_LIST = [256, 384, 512];
const WIDTH_LIST = [32, 64, 96];

class Graph extends Component {
	constructor(props) {
		super(props);

		this.width = 0;
	}

	componentDidMount() {
		const { width, height } = ReactDOM.findDOMNode(this).getBoundingClientRect();

		this.width = Math.min(width, height);
	}

	render() {
		const { props: { data, xLabel, yLabel }, width } = this;
		const margin = 70;
		const innerWidth = width - margin * 2;
		const innerHeight = width - margin * 2;
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
		const points = _.map(data, ([x, y]) => <circle cx={margin + dx * x} cy={margin + (innerHeight - dy * y)} r={3} fill='rgb(0, 122, 204)' />);
		const { r, slope, intercept } = this.reg(data);

		return (
			<svg style={{ width: width || '100%', height: width || '100%' }}>
				{
					data.length > 1 ? [
						<rect x={margin} y={margin} width={1} height={innerHeight} fill={'gray'} />,
						<rect x={margin} y={margin + innerHeight} width={innerWidth} height={1} fill={'gray'} />,
						<g fontSize={12}>
							<text x={margin + innerWidth} y={margin + innerHeight - 5} fill='black' textAnchor='end'>{xLabel}</text>
							<text x={margin + 3} y={margin + 14} fill='black'>{yLabel}</text>
							<text x={margin + innerWidth} y={margin + innerHeight + 17} fill='black' textAnchor='end'>{maxX.toFixed(2)}</text>
							<text x={margin - 3} y={margin + 14} fill='black' textAnchor='end'>{maxY.toFixed(2)}</text>
							<text x={margin + innerWidth} textAnchor='end' y={margin}>MT = {intercept.toFixed(2)} + {slope.toFixed(2)}A/W</text>
							<text x={margin + innerWidth} textAnchor='end' y={margin + 17}>R^2 = {Math.pow(r, 2).toFixed(2)}</text>
						</g>,
						<line
							x1={margin + minX * dx}
							y1={margin + (innerHeight - dy * (slope * minX + intercept))}
							x2={margin + maxX * dx}
							y2={margin + (innerHeight - dy * (slope * maxX + intercept))}
							stroke='rgb(0, 122, 204)'
							strokeDasharray='5, 5'
						/>,
						points
					] : null
				}
			</svg>
		);
	}

	/**
	 * @param {number[][]} data
	 * @returns {{r: number, slope: number, intercept: number}}
	 */
	reg(data) {
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
	}
}

class App extends Component {
	constructor(props) {
		super(props);

		/** @type {number[][]} */
		const conditions = [];
		for (let i = 0; i < TRIAL; i += 1) {
			_.forEach(_.shuffle(AMPLITUDE_LIST), (d) => _.forEach(_.shuffle(WIDTH_LIST), (w) => {
				conditions.push([d, w]);
			}));
		}

		const current = conditions.pop();

		this.scores = {};
		this.conditions = conditions;
		this.startTime = 0;
		this.state = { current, end: false, status: 0 };
		this.prevType = 0;
		document.addEventListener('mousemove', this.onMouseMove.bind(this));
	}

	/**
	 * @param {MouseEvent} e
	 */
	onMouseMove(e) {
		const { state: { status, current }, prevType } = this;
		const type = _.get(e, ['target', 'dataset', 'type'], null);

		if (status === 0 || status === 2) {
			if (prevType === 'start' && type === 'middle') {
				this.startTime = Date.now();
				this.setState({ status: 1 });
			}
		} else if (status === 1) {
			if (type === null) {
				this.setState({ status: 2 });
			} else if (type === 'end') {
				const key = JSON.stringify(current);

				if (_.has(this.scores, key)) {
					this.scores[key].push(Date.now() - this.startTime);
				} else {
					this.scores[key] = [Date.now() - this.startTime];
				}

				const next = this.conditions.pop();

				if (next) {
					this.setState({ current: next, status: 0 });
				} else {
					this.setState({ end: true, status: 0 });
				}
			}
		}

		this.prevType = type;
	}

	render() {
		const { state: { current: [a, w], end, status }, scores } = this;
		let data = {};

		_.forEach(_.toPairs(scores), ([k, vs]) => {
			const [a, w] = JSON.parse(k);
			const key = a / w;

			if (_.has(data, key)) {
				_.forEach(vs, (v) => data[key].push(v));
			} else {
				data[key] = _.slice(vs);
			}
		});

		data = _.map(_.toPairs(data), ([key, ts]) => {
			return [parseFloat(key), _.mean(ts)];
		});

		return (
			<div style={{
				width: '100%',
				height: '100%',
				display: 'flex'
			}}>
				<div style={{
					position: 'relative',
					flex: 2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: status === 1 ? 'yellow' : status === 2 ? 'red' : 'gray'
				}}>
					{
						end ? <div style={{ fontSize: '2rem', fontWeight: '900' }}>終わり！！！！</div> : [
							< div style={{ position: 'absolute', left: 10, top: 10 }}>
								<div>W: {w}</div>
								<div>A: {a}</div>
							</div>,
							<div data-type='middle' style={{
								position: 'absolute',
								left: `calc(50% - ${a / 2}px)`,
								backgroundColor: 'white',
								width: a,
								height: w,
							}} />,
							<div data-type='start' style={{
								position: 'absolute',
								left: 0,
								top: 0,
								backgroundColor: 'blue',
								width: `calc(50% - ${a / 2}px)`,
								height: '100%'
							}} />,
							<div data-type='end' style={{
								position: 'absolute',
								left: `calc(50% + ${a / 2}px)`,
								top: 0,
								backgroundColor: 'green',
								width: `calc(50% - ${a / 2}px)`,
								height: '100%'
							}} />
						]
					}
				</div>
				<div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
					<Graph data={data} xLabel='ID [bits]' yLabel='MT [ms]' />
				</div>
			</div >
		);
	}
}

ReactDOM.render(<App />, document.querySelector('main'));