export interface TrieHit {
  ref: number;
  tokenLength: number;
  editDistance: number;
}

class TrieNode {
  children = new Map<string, TrieNode>();
  refs = new Map<number, number>();
}

interface TypoHit {
  tokenLength: number;
  editDistance: number;
}

export class SearchTrie {
  private root = new TrieNode();

  insert(token: string, ref: number): void {
    if (!token) {
      return;
    }

    let node = this.root;

    for (const char of token) {
      let child = node.children.get(char);
      if (!child) {
        child = new TrieNode();
        node.children.set(char, child);
      }

      node = child;
      this.upsertRef(node, ref, token.length);
    }
  }

  findPrefix(token: string, limit = 200): TrieHit[] {
    if (!token) {
      return [];
    }

    let node: TrieNode | undefined = this.root;

    for (const char of token) {
      node = node.children.get(char);
      if (!node) {
        return [];
      }
    }

    return this.toHits(node.refs, limit, 0);
  }

  findTypoPrefix(
    token: string,
    maxEdits: number,
    limit = 200,
    maxStates = 6000,
  ): TrieHit[] {
    if (!token || maxEdits < 1) {
      return [];
    }

    const queryLength = token.length;
    const maxDepth = queryLength + maxEdits;
    const initialRow = Array.from({ length: queryLength + 1 }, (_, i) => i);
    const resultMap = new Map<number, TypoHit>();
    let statesVisited = 0;

    const collectHits = (refs: Map<number, number>, distance: number) => {
      for (const [ref, tokenLength] of refs) {
        const previous = resultMap.get(ref);
        if (!previous) {
          resultMap.set(ref, { tokenLength, editDistance: distance });
          continue;
        }

        const isBetterDistance = distance < previous.editDistance;
        const isSameDistanceShorterToken =
          distance === previous.editDistance &&
          tokenLength < previous.tokenLength;

        if (isBetterDistance || isSameDistanceShorterToken) {
          resultMap.set(ref, { tokenLength, editDistance: distance });
        }
      }
    };

    const traverse = (
      node: TrieNode,
      char: string,
      previousRow: number[],
      depth: number,
    ) => {
      if (statesVisited >= maxStates || resultMap.size >= limit) {
        return;
      }

      statesVisited += 1;

      const currentRow = [depth];

      for (let i = 1; i <= queryLength; i += 1) {
        const insertionCost = currentRow[i - 1] + 1;
        const deletionCost = previousRow[i] + 1;
        const substitutionCost =
          previousRow[i - 1] + (token[i - 1] === char ? 0 : 1);

        currentRow[i] = Math.min(insertionCost, deletionCost, substitutionCost);
      }

      const minCost = Math.min(...currentRow);
      if (minCost > maxEdits) {
        return;
      }

      const editDistance = currentRow[queryLength];
      if (editDistance <= maxEdits) {
        collectHits(node.refs, editDistance);
      }

      if (depth >= maxDepth) {
        return;
      }

      for (const [nextChar, nextNode] of node.children) {
        traverse(nextNode, nextChar, currentRow, depth + 1);

        if (statesVisited >= maxStates || resultMap.size >= limit) {
          return;
        }
      }
    };

    for (const [char, child] of this.root.children) {
      traverse(child, char, initialRow, 1);

      if (statesVisited >= maxStates || resultMap.size >= limit) {
        break;
      }
    }

    return Array.from(resultMap.entries())
      .map(([ref, value]) => ({
        ref,
        tokenLength: value.tokenLength,
        editDistance: value.editDistance,
      }))
      .sort((a, b) => {
        if (a.editDistance !== b.editDistance) {
          return a.editDistance - b.editDistance;
        }

        if (a.tokenLength !== b.tokenLength) {
          return a.tokenLength - b.tokenLength;
        }

        return a.ref - b.ref;
      })
      .slice(0, limit);
  }

  private upsertRef(node: TrieNode, ref: number, tokenLength: number): void {
    const previous = node.refs.get(ref);
    if (previous === undefined || tokenLength < previous) {
      node.refs.set(ref, tokenLength);
    }
  }

  private toHits(
    refs: Map<number, number>,
    limit: number,
    editDistance: number,
  ): TrieHit[] {
    return Array.from(refs.entries())
      .map(([ref, tokenLength]) => ({ ref, tokenLength, editDistance }))
      .sort((a, b) => {
        if (a.tokenLength !== b.tokenLength) {
          return a.tokenLength - b.tokenLength;
        }

        return a.ref - b.ref;
      })
      .slice(0, limit);
  }
}
