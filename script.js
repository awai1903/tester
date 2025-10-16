// Global variables for chart and data
let chart;
let lineSeries;
let priceData = []; // Array to store { time, price } for analysis

// Initialize chart and WebSocket
document.addEventListener('DOMContentLoaded', () => {
    // Create the chart with dark theme
    chart = LightweightCharts.createChart(document.getElementById('chart'), {
        layout: {
            background: { color: '#1e1e1e' },
            textColor: '#ffffff',
        },
        grid: {
            vertLines: { color: '#2a2e33' },
            horzLines: { color: '#2a2e33' },
        },
        width: window.innerWidth > 768 ? 800 : 350, // Responsive width
        height: 500,
    });

    lineSeries = chart.addLineSeries({
        color: '#2962ff', // Blue line for price
    });

    // Connect to Binance WebSocket for BTC/USDT trades
    const socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const time = data.T / 1000; // Convert to Unix timestamp in seconds
        const price = parseFloat(data.p); // Current price

        // Add data to chart and array
        lineSeries.update({ time, value: price });
        priceData.push({ time, price });

        // Keep only the last 100 points for performance
        if (priceData.length > 100) {
            priceData.shift(); // Remove oldest data
        }
    };

    // Add event listener for the button
    document.getElementById('analyseBtn').addEventListener('click', analyseChart);
});

// Function to analyse chart and draw support/resistance
function analyseChart() {
    if (priceData.length < 10) {
        alert('Not enough data to analyse.');
        return;
    }

    // Step 1: Calculate highs and lows from the last 50 data points
    const recentData = priceData.slice(-50); // Use last 50 points
    const highs = [];
    const lows = [];

    for (let i = 1; i < recentData.length - 1; i++) {
        // Detect pivot high: Current price > previous and next
        if (recentData[i].price > recentData[i - 1].price && recentData[i].price > recentData[i + 1].price) {
            highs.push(recentData[i].price);
        }
        // Detect pivot low: Current price < previous and next
        if (recentData[i].price < recentData[i - 1].price && recentData[i].price < recentData[i + 1].price) {
            lows.push(recentData[i].price);
        }
    }

    // Step 2: Get the last 5 major levels (sort and take recent ones)
    const recentHighs = highs.slice(-5).sort((a, b) => b - a); // Descending for resistance
    const recentLows = lows.slice(-5).sort((a, b) => a - b); // Ascending for support

    // Draw lines on the chart
    lineSeries.setData(priceData); // Ensure chart has latest data
    clearExistingLines(); // Remove previous lines if any

    recentHighs.forEach(level => drawPriceLine(level, 'Resistance'));
    recentLows.forEach(level => drawPriceLine(level, 'Support'));

    // Step 3: Check for signals based on current price
    const currentPrice = priceData[priceData.length - 1].price;
    const nearestResistance = recentHighs[0]; // Closest resistance
    const nearestSupport = recentLows[recentLows.length - 1]; // Closest support
    const trend = getTrend(priceData.slice(-5)); // Last 5 points

    let signal = 'No signal';
    if (isNearLevel(currentPrice, nearestResistance, 0.01) && trend === 'upward') {
        signal = 'BUY'; // Near resistance and upward trend
    } else if (isNearLevel(currentPrice, nearestSupport, 0.01) && trend === 'downward') {
        signal = 'SELL'; // Near support and downward trend
    }

    // Update signal panel
    document.getElementById('signalPanel').textContent = signal;
}

// Helper: Draw a price line on the chart
function drawPriceLine(level, label) {
    const priceLine = lineSeries.createPriceLine({
        price: level,
        color: label === 'Resistance' ? 'red' : 'green',
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${label}: ${level.toFixed(2)}`,
    });
}

// Helper: Clear existing price lines (simple approach: remove and recreate series if needed)
// In a real app, track lines; for simplicity, we assume redrawing overwrites.
function clearExistingLines() {
    // Lightweight Charts doesn't have a direct clear method, so we remove and add a new series
    chart.removeSeries(lineSeries);
    lineSeries = chart.addLineSeries({ color: '#2962ff' });
    lineSeries.setData(priceData); // Re-add data
}

// Helper: Check if price is near a level (e.g., within 1% tolerance)
function isNearLevel(price, level, tolerance) {
    return Math.abs(price - level) <= (level * tolerance);
}

// Helper: Determine trend from last N prices
function getTrend(lastPrices) {
    if (lastPrices.length < 2) return 'neutral';
    let upward = 0;
    for (let i = 1; i < lastPrices.length; i++) {
        if (lastPrices[i].price > lastPrices[i - 1].price) upward++;
    }
    return upward >= (lastPrices.length / 2) ? 'upward' : 'downward';
}
