import { Pool } from "pg";
import {
  PG_CONFIG,
  INDEX_NAME,
  TIME_WINDOW_MINUTES,
} from "../config/constants";
import { OptionData } from "../models/types";
import { TopicService } from "./topicService";
import { createDateTime, formatDate } from "../utils/timeUtils";

// Create database connection pool
const pool = new Pool(PG_CONFIG);

export class DataService {
  private topicService: TopicService;

  constructor() {
    this.topicService = new TopicService();
  }

  /**
   * Get the ATM strike price for the index at a specific time
   * @param date The date in YYYY-MM-DD format
   * @param time The time in HH:MM format
   */
  async getATMStrike(date: string, time: string): Promise<number> {
    // TODO: Implement ATM strike price calculation
    // 1. Get the index topic ID using the TopicService
    // 2. Query the ltp_data table to get the index price at the specified time
    // 3. Round to the appropriate strike level based on the index
    const topicId = await this.topicService.getIndexTopicId(INDEX_NAME);
    const targetTime = createDateTime(date, time);

    const res = await pool.query(
      `SELECT ltp FROM ltp_data 
       WHERE topic_id = $1 AND received_at BETWEEN $2::timestamptz - INTERVAL '${TIME_WINDOW_MINUTES} min'
       AND $2::timestamptz + INTERVAL '${TIME_WINDOW_MINUTES} min'
       ORDER BY ABS(EXTRACT(EPOCH FROM received_at - $2::timestamptz)) LIMIT 1`,
      [topicId, targetTime]
    );

    if (!res.rowCount)
      throw new Error("No LTP data found for index at entry time");

    const ltp = res.rows[0].ltp;
    const round = this.topicService.getRoundValue(INDEX_NAME);
    return Math.round(ltp / round) * round;
  }

  /**
   * Get option price data for a specific strike and type at a specific time
   * @param date The date in YYYY-MM-DD format
   * @param time The time in HH:MM format
   * @param strike The strike price
   * @param type 'CE' or 'PE'
   */
  async getOptionPrice(
    date: string,
    time: string,
    strike: number,
    type: "CE" | "PE"
  ): Promise<number> {
    // TODO: Implement option price lookup
    // 1. Get the option topic ID using the TopicService
    // 2. Query the ltp_data table to get the option price at the specified time
    const topicId = await this.topicService.getOptionTopicId(
      INDEX_NAME,
      strike,
      type
    );
    const targetTime = createDateTime(date, time);

    const res = await pool.query(
      `SELECT ltp FROM ltp_data 
       WHERE topic_id = $1 AND received_at BETWEEN $2::timestamptz - INTERVAL '${TIME_WINDOW_MINUTES} min'
       AND $2::timestamptz + INTERVAL '${TIME_WINDOW_MINUTES} min'
       ORDER BY ABS(EXTRACT(EPOCH FROM received_at - $2::timestamptz)) LIMIT 1`,
      [topicId, targetTime]
    );

    if (!res.rowCount) throw new Error(`No price found for ${type} at ${time}`);

    return res.rows[0].ltp;
  }

  /**
   * Get option price data for a specific time range
   * @param date The date in YYYY-MM-DD format
   * @param startTime The start time in HH:MM format
   * @param endTime The end time in HH:MM format
   * @param strike The strike price
   * @param type 'CE' or 'PE'
   */
  async getOptionPriceTimeSeries(
    date: string,
    startTime: string,
    endTime: string,
    strike: number,
    type: "CE" | "PE"
  ): Promise<OptionData[]> {
    // TODO: Implement option price time series lookup
    // 1. Get the option topic ID using the TopicService
    // 2. Query the ltp_data table to get all option prices in the specified time range
    const topicId = await this.topicService.getOptionTopicId(
      INDEX_NAME,
      strike,
      type
    );
    const start = createDateTime(date, startTime);
    const end = createDateTime(date, endTime);

    const res = await pool.query(
      `SELECT id, ltp, received_at, topic_id 
       FROM ltp_data 
       WHERE topic_id = $1 AND received_at BETWEEN $2 AND $3
       ORDER BY received_at ASC`,
      [topicId, start, end]
    );

    return res.rows.map((row) => ({
      id: row.id,
      topic: `NSE_FO|${topicId}`,
      ltp: row.ltp,
      received_at: row.received_at,
    }));
  }

  /**
   * Get available dates in the database
   */
  async getAvailableDates(): Promise<string[]> {
    // TODO: Implement logic to get all available trading dates in the database
    const res = await pool.query(`
      SELECT DISTINCT DATE(received_at) AS date 
      FROM ltp_data 
      ORDER BY date DESC
    `);
    return res.rows.map((r) => formatDate(r.date));
  }

  /**
   * Get the last N trading days data
   * @param n Number of trading days to retrieve
   */
  async getLastNTradingDays(n: number = 3): Promise<string[]> {
    // TODO: Implement logic to get the last N trading days from the database
    const dates = await this.getAvailableDates();
    return dates.slice(0, n);
    // return ["2025-05-21"];
  }
}
