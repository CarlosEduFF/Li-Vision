export async function detectGesture(): Promise<string> {

  const response = await fetch("http://localhost:8000/detect", {
    method: "POST"
  });

  const data = await response.json();

  return data.gesture;
}