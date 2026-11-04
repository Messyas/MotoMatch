import { type AspectWeights, DEFAULT_ASPECT_WEIGHTS, type HardConstraint } from "../../recommender";

export interface ChatState {
  readonly constraints: readonly HardConstraint[];
  readonly weights: AspectWeights;
  readonly referenceDeviceId?: string;
}

export const INITIAL_CHAT_STATE: Readonly<ChatState> = Object.freeze({
  constraints: [],
  weights: DEFAULT_ASPECT_WEIGHTS,
});
