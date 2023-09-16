export const serializeBlob = async (blob) => {
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function() {
      const arrayBuffer = reader.result;
      const serializedBlob = JSON.stringify({
        type: blob.type,
        data: Array.from(new Uint8Array(arrayBuffer))
      });
      resolve(serializedBlob);
    }
    reader.readAsArrayBuffer(blob);
  });
}

export const deserializeBlob = async (serializedBlob) => {
  const { type, data } = JSON.parse(serializedBlob);
  const blob = new Blob([new Uint8Array(data)], { type });

  return blob;
}
