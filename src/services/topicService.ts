import { Pool } from "pg";
import { PG_CONFIG } from "../config/constants";

// Create database connection pool
const pool = new Pool(PG_CONFIG);

/**
 * Service to handle mapping between index, strike prices and topic IDs
 */
export class TopicService {
  /**
   * Get the topic ID for an index
   * @param indexName The name of the index (BANKNIFTY, NIFTY, etc.)
   */
  public async getIndexTopicId(indexName: string): Promise<number> {
    // TODO: Implement logic to get the topic ID for an index
    // 1. Query the database to find the topic_id where index_name matches and type is NULL
    // 2. Return the topic_id or throw an error if not found
    const res = await pool.query(
      `SELECT topic_id FROM topics WHERE index_name = $1 AND type IS NULL`,
      [indexName]
    );
    if (res.rowCount === 0)
      throw new Error(`Index topic not found: ${indexName}`);
    return res.rows[0].topic_id;
  }

  /**
   * Get the topic ID for an option
   * @param indexName The index name (BANKNIFTY, NIFTY, etc.)
   * @param strike The strike price
   * @param type The option type (CE or PE)
   */
  public async getOptionTopicId(
    indexName: string,
    strike: number,
    type: "CE" | "PE"
  ): Promise<number> {
    // TODO: Implement logic to get the topic ID for an option
    // 1. Query the database to find the topic_id for the given index, strike, and type
    // 2. Return the topic_id or throw an error if not found
    const res = await pool.query(
      `SELECT topic_id FROM topics WHERE index_name = $1 AND strike = $2 AND type = $3`,
      [indexName, strike, type]
    );
    if (res.rowCount === 0) {
      throw new Error(`Option topic not found: ${indexName} ${strike} ${type}`);
    }
    return res.rows[0].topic_id;
  }

  /**
   * Get the round value for strike prices based on the index
   * @param indexName The index name
   */
  public getRoundValue(indexName: string): number {
    // TODO: Implement logic to get the round value for an index
    // Different indices have different strike intervals:
    // - BANKNIFTY: 100
    // - NIFTY, FINNIFTY: 50
    // - MIDCPNIFTY: 25
    switch (indexName.toUpperCase()) {
      case "BANKNIFTY":
        return 100;
      case "NIFTY":
      case "FINNIFTY":
        return 50;
      case "MIDCPNIFTY":
        return 25;
      default:
        return 100;
    }
  }

  /**
   * Get the lot size for an index
   * @param indexName The name of the index
   */
  public getLotSize(indexName: string): number {
    // TODO: Implement logic to get the lot size for an index
    // Different indices have different lot sizes:
    // - NIFTY: 75
    // - BANKNIFTY: 30
    // - MIDCPNIFTY: 120
    // - FINNIFTY: 65
    switch (indexName.toUpperCase()) {
      case "BANKNIFTY":
        return 30;
      case "NIFTY":
        return 75;
      case "MIDCPNIFTY":
        return 120;
      case "FINNIFTY":
        return 65;
      default:
        return 1;
    }
  }
}
