import {
  INDEX_NAME,
  SL_PERCENT,
  PNL_TARGET_PERCENT,
  PNL_SL_PERCENT,
  ENTRY_TIME,
  ADJUSTMENT_TIME,
  EXIT_TIME,
} from "../config/constants";
import { DataService } from "./dataService";
import {
  BacktestResult,
  OptionData,
  Position,
  TradeDay,
} from "../models/types";
import { TopicService } from "./topicService";
import { createDateTime } from "../utils/timeUtils";

export class BacktestService {
  private dataService: DataService;
  private topicService: TopicService;
  private lotSize: number;

  constructor() {
    this.dataService = new DataService();
    this.topicService = new TopicService();
    this.lotSize = this.topicService.getLotSize(INDEX_NAME);
  }

  /**
   * Run the backtest over multiple days
   */
  async runBacktest(days: string[]): Promise<BacktestResult> {
    const results: BacktestResult = {
      days: [],
      totalPnl: 0,
      winningDays: 0,
      losingDays: 0,
      winRate: 0,
      averageDailyPnl: 0,
    };

    for (const date of days) {
      const tradeDay = await this.processTradingDay(date);
      results.days.push(tradeDay);
      results.totalPnl += tradeDay.totalPnl;

      if (tradeDay.totalPnl > 0) results.winningDays++;
      else if (tradeDay.totalPnl < 0) results.losingDays++;
    }

    results.winRate = (results.winningDays / results.days.length) * 100;
    results.averageDailyPnl = results.totalPnl / results.days.length;

    return results;
  }

  /**
   * Process a single trading day — enter, monitor, exit
   */
  private async processTradingDay(date: string): Promise<TradeDay> {
    // 1. Get ATM Strike at ENTRY_TIME
    const atmStrike = await this.dataService.getATMStrike(date, ENTRY_TIME);

    // 2. Fetch CE and PE prices at ENTRY_TIME
    const ceEntry = await this.dataService.getOptionPrice(
      date,
      ENTRY_TIME,
      atmStrike,
      "CE"
    );
    const peEntry = await this.dataService.getOptionPrice(
      date,
      ENTRY_TIME,
      atmStrike,
      "PE"
    );

    const entryTime = createDateTime(date, ENTRY_TIME);

    const ce: Position = {
      type: "CE",
      entryPrice: ceEntry,
      entryTime,
      strikePrice: atmStrike,
      isActive: true,
    };

    const pe: Position = {
      type: "PE",
      entryPrice: peEntry,
      entryTime,
      strikePrice: atmStrike,
      isActive: true,
    };

    const tradeDay: TradeDay = {
      date,
      atmStrike,
      positions: [ce, pe],
      totalPnl: 0,
      madeAdjustment: false,
      dayPnlPercent: 0,
    };

    // 3. Fetch price time series till EXIT_TIME
    const ceSeries = await this.dataService.getOptionPriceTimeSeries(
      date,
      ENTRY_TIME,
      EXIT_TIME,
      atmStrike,
      "CE"
    );

    const peSeries = await this.dataService.getOptionPriceTimeSeries(
      date,
      ENTRY_TIME,
      EXIT_TIME,
      atmStrike,
      "PE"
    );

    // 4. Monitor and exit positions based on SL/Target/EOD/Adjustment logic
    await this.processOptionPrices(tradeDay, ceSeries, peSeries, date);

    // 5. Compute PnL
    tradeDay.totalPnl = this.calculateDayPnL(tradeDay);
    tradeDay.dayPnlPercent =
      (tradeDay.totalPnl / (ceEntry + peEntry) / this.lotSize) * 100;

    return tradeDay;
  }

  /**
   * Process SL/Target/EOD/Adjustment rules on option prices
   */
  private async processOptionPrices(
    tradeDay: TradeDay,
    ceSeries: OptionData[],
    peSeries: OptionData[],
    date: string
  ) {
    const ce = tradeDay.positions[0];
    const pe = tradeDay.positions[1];

    const allTicks = [...ceSeries, ...peSeries].sort(
      (a, b) => a.received_at.getTime() - b.received_at.getTime()
    );

    let adjusted = false;

    for (const tick of allTicks) {
      if (!ce.isActive && !pe.isActive) break;

      if (ce.isActive && tick.topic.includes("CE")) {
        const changePct = ((tick.ltp - ce.entryPrice) / ce.entryPrice) * 100;

        if (changePct <= -SL_PERCENT) {
          ce.isActive = false;
          ce.exitPrice = tick.ltp;
          ce.exitTime = tick.received_at;
          ce.pnl = (tick.ltp - ce.entryPrice) * this.lotSize;
          ce.exitReason = "SL";
        }
      }

      if (pe.isActive && tick.topic.includes("PE")) {
        const changePct = ((tick.ltp - pe.entryPrice) / pe.entryPrice) * 100;

        if (changePct <= -SL_PERCENT) {
          pe.isActive = false;
          pe.exitPrice = tick.ltp;
          pe.exitTime = tick.received_at;
          pe.pnl = (tick.ltp - pe.entryPrice) * this.lotSize;
          pe.exitReason = "SL";
        }
      }

      // Combined P&L target/SL check
      const ceLtp = tick.topic.includes("CE")
        ? tick.ltp
        : ceSeries.find((t) => t.received_at <= tick.received_at)?.ltp ||
          ce.entryPrice;
      const peLtp = tick.topic.includes("PE")
        ? tick.ltp
        : peSeries.find((t) => t.received_at <= tick.received_at)?.ltp ||
          pe.entryPrice;

      const combinedPnl =
        (ceLtp - ce.entryPrice + (peLtp - pe.entryPrice)) * this.lotSize;
      const combinedPnlPercent =
        (combinedPnl / ((ce.entryPrice + pe.entryPrice) * this.lotSize)) * 100;

      if (combinedPnlPercent >= PNL_TARGET_PERCENT) {
        for (const pos of [ce, pe]) {
          if (pos.isActive) {
            pos.isActive = false;
            pos.exitPrice = tick.ltp;
            pos.exitTime = tick.received_at;
            pos.pnl = (tick.ltp - pos.entryPrice) * this.lotSize;
            pos.exitReason = "TOTAL_PL_TARGET";
          }
        }
      } else if (combinedPnlPercent <= -PNL_SL_PERCENT) {
        for (const pos of [ce, pe]) {
          if (pos.isActive) {
            pos.isActive = false;
            pos.exitPrice = tick.ltp;
            pos.exitTime = tick.received_at;
            pos.pnl = (tick.ltp - pos.entryPrice) * this.lotSize;
            pos.exitReason = "TOTAL_PL_SL";
          }
        }
      }
    }

    // Adjustment re-entry logic
    const bothExitedBeforeAdjustment =
      !ce.isActive &&
      !pe.isActive &&
      (ce.exitTime || pe.exitTime) &&
      ce.exitTime! < createDateTime(date, ADJUSTMENT_TIME) &&
      pe.exitTime! < createDateTime(date, ADJUSTMENT_TIME);

    if (bothExitedBeforeAdjustment && !adjusted) {
      const ceReEntry = await this.dataService.getOptionPrice(
        date,
        ADJUSTMENT_TIME,
        tradeDay.atmStrike,
        "CE"
      );

      const peReEntry = await this.dataService.getOptionPrice(
        date,
        ADJUSTMENT_TIME,
        tradeDay.atmStrike,
        "PE"
      );

      const ceLast = ceSeries[ceSeries.length - 1];
      const peLast = peSeries[peSeries.length - 1];

      const ceAdj: Position = {
        type: "CE",
        entryPrice: ceReEntry,
        entryTime: createDateTime(date, ADJUSTMENT_TIME),
        strikePrice: tradeDay.atmStrike,
        isActive: false,
        exitPrice: ceLast?.ltp,
        exitTime: ceLast?.received_at,
        pnl: ((ceLast?.ltp || 0) - ceReEntry) * this.lotSize,
        exitReason: "EOD",
      };

      const peAdj: Position = {
        type: "PE",
        entryPrice: peReEntry,
        entryTime: createDateTime(date, ADJUSTMENT_TIME),
        strikePrice: tradeDay.atmStrike,
        isActive: false,
        exitPrice: peLast?.ltp,
        exitTime: peLast?.received_at,
        pnl: ((peLast?.ltp || 0) - peReEntry) * this.lotSize,
        exitReason: "EOD",
      };

      tradeDay.adjustmentPositions = [ceAdj, peAdj];
      tradeDay.madeAdjustment = true;
    }

    // End-of-day square-off
    for (const pos of tradeDay.positions) {
      if (pos.isActive) {
        const latest = (pos.type === "CE" ? ceSeries : peSeries).at(-1);
        pos.exitPrice = latest?.ltp;
        pos.exitTime = latest?.received_at;
        pos.pnl = ((latest?.ltp || 0) - pos.entryPrice) * this.lotSize;
        pos.isActive = false;
        pos.exitReason = "EOD";
      }
    }
  }

  /**
   * Calculate total PnL for a day
   */
  private calculateDayPnL(tradeDay: TradeDay): number {
    let total = 0;

    for (const pos of tradeDay.positions) {
      total += pos.pnl || 0;
    }

    if (tradeDay.adjustmentPositions) {
      for (const pos of tradeDay.adjustmentPositions) {
        total += pos.pnl || 0;
      }
    }

    return total;
  }
}
