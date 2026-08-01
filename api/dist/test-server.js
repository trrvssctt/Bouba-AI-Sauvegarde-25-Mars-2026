"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
console.log(`Attemping to start server on port ${port}`);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', port: port });
});
app.listen(port, () => {
    console.log(`🚀 Test Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
}).on('error', (err) => {
    console.error('Server start error:', err);
    process.exit(1);
});
//# sourceMappingURL=test-server.js.map