export async function detectGesture(uri: string): Promise<string> {

  const form = new FormData();

  form.append("file", {
    uri,
    name: "frame.jpg",
    type: "image/jpeg"
  } as any);

  const response = await fetch("https://li-vision.onrender.com/detect", {
    method: "POST",
    body: form,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  const data = await response.json();
  return data.gesture;
}