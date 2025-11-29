import { countReferendum } from './referendum.js';
import { countMajorityVote } from './majority-vote.js';
import { countHareNiemeyer } from './hare-niemeyer.js';
import { countSainteLague } from './sainte-lague.js';

/**
 * Central registry for all counting algorithms.
 * Implements Factory Pattern for loose coupling between service layer and algorithms.
 *
 * Adding a new algorithm:
 * 1. Create new file in algorithms/
 * 2. Import function here
 * 3. Add to ALGORITHMS object with matching counting_method key
 *
 * @module algorithm-registry
 */

/**
 * Maps counting_method names (from database) to algorithm functions.
 * Keys must match values in elections.counting_method column.
 *
 * @constant {Object<string, Function>}
 */
const ALGORITHMS = {
  sainte_lague: countSainteLague,
  hare_niemeyer: countHareNiemeyer,
  highest_votes_absolute: countMajorityVote,
  highest_votes_simple: countMajorityVote,
  yes_no_referendum: countReferendum,
};

/**
 * Retrieves the algorithm function for a given counting method.
 *
 * @param {string} method - The counting method name (e.g., 'sainte_lague')
 * @returns {Function} The algorithm function
 * @throws {Error} If counting method is unknown or invalid type
 *
 * @example
 * const algo = getAlgorithm('sainte_lague');
 * const result = algo({ votes, config });
 */
export const getAlgorithm = (method) => {
  // Validate input type
  if (typeof method !== 'string' || !method) {
    throw new Error('Counting method must be a non-empty string');
  }

  // Check if method exists in allowed algorithms (prevents object injection)
  if (!Object.prototype.hasOwnProperty.call(ALGORITHMS, method)) {
    throw new Error(
      `Unknown counting method: '${method}'. Valid methods: ${Object.keys(ALGORITHMS).join(', ')}`,
    );
  }

  // Safe access after validation
  // eslint-disable-next-line security/detect-object-injection
  const algorithm = ALGORITHMS[method];
  return algorithm;
};

/**
 * Returns list of all supported counting methods.
 *
 * @returns {string[]} Array of method names
 */
export const getSupportedMethods = () => Object.keys(ALGORITHMS);
