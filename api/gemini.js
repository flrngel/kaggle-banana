export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { image } = await req.json();

  // Simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return a dummy image URL
  return new Response('https://via.placeholder.com/1024', {
    headers: { 'Content-Type': 'text/plain' },
  });
}
