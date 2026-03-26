export async function detectGesture(uri: string): Promise<string> {
  const form = new FormData();

  form.append("file", {
    uri,
    name: "frame.jpg",
    type: "image/jpeg",
  } as any);

  const response = await fetch("https://li-vision.onrender.com/detect", {
    method: "POST",
    body: form,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Erro na API: ${response.status} - ${text}`);
  }

  const data = JSON.parse(text);
  return data.gesture;
}