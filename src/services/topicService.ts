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
    return 0;
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
    return 0;
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
    return 100;
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
    return 30;
  }
}
