const React = require('react');
const ReactDOM = require('react-dom');
const _ = require('lodash');
const { Component } = React;

require('./index.scss');

class App extends Component {
	constructor(props) {
		super(props);

		this.onClick = this.onClick.bind(this);
		this.state = {
			start: false,
			scores: []
		};
		this.startTime = 0;
		this.timer = -1;

		this.start();
	}

	start() {
		this.timer = setTimeout(() => {
			this.startTime = Date.now();
			this.setState({ start: true });
		}, _.random(5, 10) * 1000);
	}

	render() {
		const { state: { start, scores } } = this;

		return (
			<div style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column'
			}}>
				<div onClick={this.onClick} style={{
					backgroundColor: start ? 'rgb(238, 110, 115)' : 'white', flex: 1
				}}>
					<div style={{
						color: 'rgb(30, 30, 30)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '4em',
						fontWeight: '900',
						height: '100%'
					}}>
						{start ? 'YO' : scores.length ? `${_.last(scores)}ms` : null}
					</div>
				</div>
				<div style={{
					backgroundColor: 'rgb(30, 30, 30)',
					color: 'rgb(212, 212, 212)',
					padding: '5px 10px'
				}}>
					{scores.length === 0 ? null : `${_.mean(scores).toFixed(2)}ms`}
					<span style={{ fontSize: '0.8em', marginLeft: '5px', color: 'gray' }}>
						{_.map(scores, (a, i) => <span style={{ marginLeft: '5px' }}>{i}: {a}ms</span>)}
					</span>
				</div>
			</div>
		);
	}

	onClick() {
		const { state: { start, scores } } = this;

		if (start) {
			const t = Date.now() - this.startTime;

			scores.push(t);
			this.setState({
				start: false,
				scores
			});
			this.start();
		} else {
			alert('はやい');
			clearTimeout(this.timer);
			this.start();
		}
	}
}

const $main = document.querySelector('main');
ReactDOM.render(<App />, $main);