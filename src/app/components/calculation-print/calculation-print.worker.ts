/// <reference lib="webworker" />

import { generateCalculationData } from "./generate-calculation-data";

addEventListener('message', async ({ data }) => {
  const base64Encoded = await generateCalculationData(data);

  postMessage(base64Encoded);
});
