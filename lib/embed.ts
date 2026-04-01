export async function embed(texts: string[]) {
  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: texts }),
    }
  );

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("Embedding failed: " + JSON.stringify(data));
  }

  // Always normalize to array of flat embeddings
  return data.map((item: any) => {
    // If item is nested [[...]], unwrap it
    if (Array.isArray(item[0])) return item[0];
    return item;
  });
}
