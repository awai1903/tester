// Global variables
let chart;
let lineSeries;
let priceData = []; // { time, price }
let selectedPair = 'btcusdt';
let websocket;
let rsiSeries, macdSeries; // For indicator overlays

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    chart = LightweightCharts.createChart(document.getElementById('chart'), {
        layout: { background: { color: '#1e1e1e' }, textColor: '#ffffff' },
        grid: { vertLines: { color: '#2a2e33' }, horzLines: { color: '#2a2e33' } },
        width: window.innerWidth > 768 ? 800 : 350,
        height: 500,
    });

    lineSeries = chart.addLineSeries({ color: '#2962ff' }); // Price line
    rsiSeries = chart.addLineSeries({ color: '#ff9800', priceScaleId: 'rsi' }); // RSI overlay
    chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } }); // Separate scale

    document.getElementById('pairSelector').addEventListener('change', (e) => {
        selectedPair = e.target.value;
        priceData = [];
        setupWebSocket();
        lineSeries.setData([]);
        rsiSeries.setData([]);
        updateIndicators(); // Reset indicators
        document.getElementById('signalPanel').textContent = 'No signal yet';
    });

    setupWebSocket();
    document.getElementById('analyseBtn').addEventListener('click', analyseChart); // Keep manual button
});

// Set up WebSocket and real-time processing
function setupWebSocket() {
    if (websocket) websocket.close();
    websocket = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedPair}@trade`);
    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const time = data.T / 1000;
        const price = parseFloat(data.p);
        priceData.push({ time, price });
        if (priceData.length > 200) priceData.shift(); // Limit data

        lineSeries.update({ time, value: price });
        updateIndicators(); // Recalculate on new data
        generateSignals(); // Check for signals in real-time
    };
}

// Update indicators in real-time
function updateIndicators() {
    if (priceData.length < 14) return; // Need data for RSI

    const rsi = calculateRSI(priceData.slice(-14)); // Last 14 for RSI
    document.getElementById('rsiValue').textContent = rsi.toFixed(2);
    rsiSeries.update({ time: priceData[priceData.length - 1].time, value: rsi });

    const macd = calculateMACD(priceData);
    document.getElementById('macdValue').textContent = macd.line.toFixed(2);
    
    const trend = getTrend(priceData.slice(-10)); // Last 10 for trend
    document.getElementById('trendValue').textContent = trend;
}

// Generate signals based on indicators
function generateSignals() {
    if (priceData.length < 20) return; // Need enough data
    
    const rsi = calculateRSI(priceData.slice(-14));
    const macd = calculateMACD(priceData);
    const levels = calculateLevels(priceData);
    const currentPrice = priceData[priceData.length - 1].price;
    const trend = getTrend(priceData.slice(-10));
    
    let signal = 'No signal';
    
    if (rsi < 30 && macd.line > macd.signal && trend === 'upward' && isNearLevel(currentPrice, levels.supports[0], 0.01)) {
        signal = 'BUY'; // RSI oversold, MACD bullish, uptrend, near support
    } else if (rsi > 70 && macd.line < macd.signal && trend === 'downward' && isNearLevel(currentPrice, levels.resistances[0], 0.01)) {
        signal = 'SELL'; // RSI overbought, MACD bearish, downtrend, near resistance
    }
    
    document.getElementById('signalPanel').textContent = signal + ' on ' + selectedPair.toUpperCase();
    // Add visual signal on chart
    if (signal === 'BUY') chart.addLineSeries().setData([{ time: priceData[priceData.length - 1].time, value: currentPrice }]); // Simple marker
}

// Indicator calculations
function calculateRSI(data, period = 14) {
    let gains = 0, losses = 0;
    for (let i = 1; i < data.length; i++) {
        const diff = data[i].price - data[i-1].price;
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(data) {
    const ema12 = exponentialMovingAverage(data, 12);
    const ema26 = exponentialMovingAverage(data, 26);
    const line = ema12 - ema26;
    const signal = exponentialMovingAverage([{ value: line }], 9); // Simplified
    return { line, signal };
}

function exponentialMovingAverage(data, period) {
    let multiplier = 2 / (period + 1);
    let ema = data[0].price;
    for (let i = 1; i < data.length; i++) {
        ema = (data[i].price - ema) * multiplier + ema;
    }
    return ema;
}

// Other functions from previous code (e.g., calculateLevels, etc.) remain similar
// ... [Include the rest from the previous script.js as needed]

async function analyseChart() {
    // Manual analysis as before, but now with indicators
    console.log('Manual analysis triggered');
}
