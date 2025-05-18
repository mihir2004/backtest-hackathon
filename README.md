# TRADO <> IIT Ropar Hackathon

Welcome to the Trado <> IIT Ropar Hackathon! This is the second part of a two part hackathon conducted by Trado, at IIT Ropar.

Build a backtesting engine to evaluate an options trading strategy on Indian indices.

## Problem Statement

Create a backtesting engine that tests a defined option buying strategy using historical market data from a PostgreSQL/TimescaleDB database.

### Strategy to Test

1. **Entry**: At the configured entry time (default: 9:25 AM):
   - Buy 1 lot of ATM CE
   - Buy 1 lot of ATM PE

2. **Exit Criteria**:
   - Individual Stop Loss: Exit a position if it loses 25% of its premium
   - Combined Target: Exit both positions if they give a total P&L of 25%
   - Combined Stop Loss: Exit both positions if they give a total P&L of -10%
   - End of Day: Square off at 3:15 PM

3. **Adjustment Logic**:
   - If both positions are exited before 2:00 PM, re-enter with fresh ATM options
   - Only one adjustment per day allowed
   - Adjustment positions held until market close without SL/Target

## Your Task

1. Complete the boilerplate code by implementing:
   - Data retrieval from the database
   - Strategy logic and position management
   - P&L calculation and reporting

2. The code should:
   - Work with any of the supported indices (BANKNIFTY, NIFTY, FINNIFTY, MIDCPNIFTY)
   - Support configurable parameters (stop loss percentages, target percentages)
   - Process data for the last 3 trading days

## Database Structure

The database already has historical data stored with this schema:

```sql
-- topics table maps instruments to IDs
CREATE TABLE topics (
    topic_id SERIAL PRIMARY KEY,
    topic_name TEXT NOT NULL UNIQUE,
    index_name TEXT,
    type TEXT,
    strike NUMERIC
);

-- ltp_data table contains time-series price data
CREATE TABLE ltp_data (
    id INTEGER NOT NULL,
    topic_id INTEGER REFERENCES topics(topic_id),
    ltp NUMERIC(10, 2) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, received_at)
);
```

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from the sample:
   ```bash
   cp .env.sample .env
   ```

3. Run the application:
   ```bash
   npm start
   ```
