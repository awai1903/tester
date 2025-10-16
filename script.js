// Global variables
let chart;
let lineSeries; // For simplicity, using line series; can switch to candlestick
let priceData = []; // Stores { time, price } for the selected pair
let selectedPair = 'btcusdt'; // Default pair
let websocket; // For real-time data

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set up chart with dark theme
    chart = LightweightCharts.createChart(document.getElementById('chart'), {
        layout: {
            background: { color: '#1e1e1e' },
            textColor: '#ffffff',
        },
        grid: {
            vertLines: { color: '#2a2e33' },
            horzLines: { color: '#2a2e33' },
        },
        width: window.innerWidth > 768 ? 800 : 350,
        height: 500,
    });

    lineSeries = chart.addLineSeries({ color: '#2962ff' });

    // Pair selector event
    document.getElementById('pairSelector').addEventListener('change', (e) => {
        selectedPair = e.target.value;
        priceData = []; // Reset data for new pair
        setupWebSocket(); // Reconnect WebSocket
        lineSeries.setData([]); // Clear chart
        document.getElementById('signalPanel').textContent = 'No signal yet';
    });

    // Set up initial WebSocket
    setupWebSocket();

    // Analyse button event
    document.getElementById('analyseBtn').addEventListener('click', analyseChart);
});

// Function to set up WebSocket for the selected pair
function setupWebSocket() {
    if (websocket) websocket.close();
    websocket = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedPair}@trade`);

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const time = data.T / 1000; // Unix timestamp
        const price = parseFloat(data.p);
        lineSeries.update({ time, value: price });
        priceData.push({ time, price });
        if (priceData.length > 100) priceData.shift(); // Limit data size
    };
}

// Function to analyse chart with backtesting
async function analyseChart() {
    if (priceData.length < 10) {
        alert('Not enough real-time data. Fetching historical data...');
    }

    try {
        // Step 1: Fetch historical data for backtesting (last 200 1-minute candles)
        const historicalData = await fetchHistoricalData(selectedPair);
        const allData = [...historicalData, ...priceData]; // Combine for analysis

        // Step 2: Calculate support and resistance levels from historical data
        const levels = calculateLevels(allData);
        const supportLevels = levels.supports.slice(0, 5); // At least 5 levels
        const resistanceLevels = levels.resistances.slice(0, 5);

        // Step 3: Draw levels on the chart
        clearExistingLines();
        resistanceLevels.forEach(level => drawPriceLine(level, 'Resistance', 'red'));
        supportLevels.forEach(level => drawPriceLine(level, 'Support', 'green'));

        // Step 4: Backtest levels and evaluate current movement
        const backtestResults = backtestLevels(historicalData, levels);
        const currentPrice = priceData[priceData.length - 1].price;
        const trend = getTrend(priceData.slice(-5)); // Check recent trend

        let signal = 'No signal';
        const nearestResistance = resistanceLevels[0];
        const nearestSupport = supportLevels[supportLevels.length - 1];

        if (isNearLevel(currentPrice, nearestResistance, 0.01)) {
            if (backtestResults[nearestResistance] === 'downward') {
                signal = 'SELL'; // Historical downward reversal
            } else if (trend === 'upward') {
                // Predict breakout in 1 minute
                setTimeout(() => {
                    if (getTrend(priceData.slice(-5)) === 'upward') {
                        displaySignal('BUY'); // Upward strength
                    }
                }, 60000); // 1 minute delay
            }
        } else if (isNearLevel(currentPrice, nearestSupport, 0.01)) {
            if (backtestResults[nearestSupport] === 'upward') {
                signal = 'BUY'; // Historical upward reversal
            } else if (trend === 'downward') {
                signal = 'SELL';
            }
        }

        displaySignal(signal); // Update panel and chart
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Error during analysis. Check console.');
    }
}

// Fetch historical data from Binance API
async function fetchHistoricalData(pair) {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair.toUpperCase()}&interval=1m&limit=200`);
    const data = await response.json();
    return data.map(candle => ({
        time: candle[0] / 1000, // Open time
        price: parseFloat(candle[4]) // Close price
    }));
}

// Calculate support and resistance levels
function calculateLevels(data) {
    const highs = [];
    const lows = [];
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i].price > data[i - 1].price && data[i].price > data[i + 1].price) highs.push(data[i].price);
        if (data[i].price < data[i - 1].price && data[i].price < data[i + 1].price) lows.push(data[i].price);
    }
    return {
        supports: lows.slice(-5).sort((a, b) => a - b),
        resistances: highs.slice(-5).sort((a, b) => b - a)
    };
}

// Backtest levels: Check historical reversals
function backtestLevels(data, levels) {
    const results = {};
    levels.resistances.forEach(level => {
        results[level] = checkReversal(data, level) ? 'downward' : 'upward';
    });
    levels.supports.forEach(level => {
        results[level] = checkReversal(data, level) ? 'upward' : 'downward';
    });
    return results;
}

function checkReversal(data, level) {
    for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i].price - level) < (level * 0.01)) { // Near level
            const nextCandles = data.slice(i + 1, i + 5); // Next 5 candles
            const reversedDown = nextCandles.every(c => c.price < data[i].price);
            const reversedUp = nextCandles.every(c => c.price > data[i].price);
            return reversedDown ? 'downward' : reversedUp ? 'upward' : null;
        }
    }
    return null;
}

// Helper functions (from previous code, with updates)
function drawPriceLine(level, label, color) {
    lineSeries.createPriceLine({
        price: level,
        color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${label}: ${level.toFixed(2)}`,
    });
}

function clearExistingLines() {
    chart.removeSeries(lineSeries);
    lineSeries = chart.addLineSeries({ color: '#2962ff' });
    lineSeries.setData(priceData);
}

function isNearLevel(price, level, tolerance) {
    return Math.abs(price - level) <= (level * tolerance);
}

function getTrend(lastPrices) {
    if (lastPrices.length < 2) return 'neutral';
    let upward = 0;
    for (let i = 1; i < lastPrices.length; i++) {
        if (lastPrices[i].price > lastPrices[i - 1].price) upward++;
    }
    return upward >= (lastPrices.length / 2) ? 'upward' : 'downward';
}

function displaySignal(signal) {
    document.getElementById('signalPanel').textContent = `${signal} on ${selectedPair.toUpperCase()}`;
    // Add visual marker on chart (e.g., a shape for the signal)
    if (signal === 'BUY') {
        chart.addLineSeries().setData([{ time: Date.now() / 1000, value: priceData[priceData.length - 1].price }]); // Simple marker
    } else if (signal === 'SELL') {
        // Add custom shape or marker
    }
        }
