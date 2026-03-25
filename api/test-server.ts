import express from 'express';

const app = express();
const port = process.env.PORT || 3002;

console.log(`Attemping to start server on port ${port}`);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: port });
});

app.listen(port, () => {
  console.log(`🚀 Test Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}).on('error', (err: any) => {
  console.error('Server start error:', err);
  process.exit(1);
});