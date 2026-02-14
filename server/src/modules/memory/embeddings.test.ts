import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "./embeddings.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it("returns -1 for opposite vectors", () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it("returns 0 for different-length vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("handles zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("computes similarity for real-ish embeddings", () => {
    const cat = [0.8, 0.1, 0.9, 0.2];
    const dog = [0.7, 0.2, 0.85, 0.15];
    const car = [0.1, 0.9, 0.1, 0.8];

    const catDogSim = cosineSimilarity(cat, dog);
    const catCarSim = cosineSimilarity(cat, car);

    // Cat and dog should be more similar than cat and car
    expect(catDogSim).toBeGreaterThan(catCarSim);
    expect(catDogSim).toBeGreaterThan(0.9);
  });
});
