"use strict";
let dataX = [];
let dataY = [];
let dataY2 = [];
let dataY3 = [];
let xMin = Number.MAX_SAFE_INTEGER;
let xMax = 0;
let height = 600;
let isMobile = false;

function buttonsPlugin(opts) {
    return {
        hooks: {
            ready: u => {
                function zoomRange(seconds) {
                    u.setScale('x', {
                        min: xMax - seconds,
                        max: xMax
                    });
                }

                const day = document.getElementById("day");
                day.addEventListener("click", e => {
                    zoomRange(60 * 60 * 24);
                });
                const week = document.getElementById("week");
                week.addEventListener("click", e => {
                    zoomRange(60 * 60 * 24 * 7);
                });
                document.getElementById("all").addEventListener("click", e => {
                    u.setScale('x', {
                        min: xMin,
                        max: xMax
                    });
                })
            }
        }
    };
}

function getSize() {
    return {
        width: document.getElementById("plot").clientWidth,
		height: height
    };
}

function processCSV() {
	let plotData = [dataX, dataY, dataY2];
	let opts = {
		title: "Temperature and humidity stats",
		id: "chart1",
		class: "my-chart",
		...getSize(),
        plugins: [
            buttonsPlugin({})
        ],
		scales: {
			x: {
				time: true,
				range: (u, dataMin, dataMax) => {
                    if ((dataMax - dataMin) % (60 * 60 * 24) === 0) {
                        return [dataMin, dataMax];
                    } else {
					    return [dataMin, Math.ceil(dataMax / (24 * 60 * 60)) * 24 * 60 * 60];
                    }
				}
			},
			y: {
				auto: true,
				// always show zero
				// https://github.com/leeoniya/uPlot/issues/143#issuecomment-595251878
				/*
				range: (u, dataMin, dataMax) => {
        			let [min, max] = uPlot.rangeNum(dataMin, dataMax, 0.2, true);
        			return [
          				Math.min(0, min),
          				Math.max(0, max),
        			];
				}
				*/
			},
			"%": {
				//range: [0, 100]
				auto: true,
			},
		},
		series: [
			{
				label: "t",
				value: "{YYYY}-{MM}-{DD} {HH}:{mm}",
				class: "monospace"
			},
			{
				label: "temperature",
				class: "monospace",
				width: 1,
				stroke: `rgba(230, 180, 0, 100%)`,
				drawStyle: 0, // line
				lineInterpolation: 0, // linear
				spanGaps: true,
				//paths
			},
			{
				label: "relative humidity",
				scale: "%",
				class: "monospace",
				width: 1,
				stroke: `rgba(35, 50, 255, 100%)`,
				drawStyle: 0, // line
				lineInterpolation: 0, // linear
				spanGaps: true,
				//paths
			},
			/*
			{
				label: "absolute humidity",
				scale: "grams/m³",
				class: "monospace",
				width: 2,
				stroke: `rgb(85, 100, 255)`,
				drawStyle: 0, // line
				lineInterpolation: 0, // linear
				spanGaps: true,
				//paths
			}
			*/
		],
		axes: [
			{
				//label: "Zeit",
				labelSize: 20,
				values: [[3600 * 24, "{D}.{M}.{YY}\n{H}:{mm}", null, null ]]
			},
			{
				space: 50,
				scale: "%",
				label: "RH",
			},
			{
				space: 50,
				side: 1,
				label: "°C",
			},
		],
	};

	document.getElementById("plot").innerHTML = "";
	let uplot = new uPlot(opts, plotData, document.getElementById("plot"));
	uplot.setCursor({left: 10000, top: 0}); // show latest values instantly
	uplot.cursor.lock = true;
	let legendEl = document.querySelector(".u-legend");
	legendEl.classList.remove("u-inline");

    document.getElementById("buttons").style.display = "";

    // mobile view: activate 24h initially
    setTimeout(() => {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        if (vh > vw) {
            document.getElementById("day").click();
			height = vh / 2;
			uplot.setSize(getSize());
			isMobile = true;
        }
    }, 500);

    // automatically resize plot
    window.addEventListener("resize", e => {
		const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
		const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
		if (isMobile && vw > vh) {
			height = vh;
		} else if (isMobile && vh > vw) {
			height = vh / 2;
		}
        uplot.setSize(getSize());
    });
}
Papa.parse('./x.csv', {
	delimiter: ",",
	header: true,
	download: true,
	step: function(row) {
		if (row.errors.length > 0) {
			return;
		}
        const t = Number(row.data["time"]);
		dataX.push(t);
        if (t > xMax) {
            xMax = t;
        }
        if (t < xMin) {
            xMin = t;
        }
		dataY.push(Number(row.data["celsius"]) / 10.0);
		dataY2.push(Number(row.data["humidity"]) / 10.0);
		//dataY3.push(Number(row.data["abs_humidity"]));
	},
	complete: processCSV,
});