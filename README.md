# ApiGateWay
[![ApiGateWay Live](https://img.shields.io/badge/Live-Demo-green?style=flat-square&logo=render&link=https://apigateway-1k6n.onrender.com)](https://apigateway-1k6n.onrender.com)
[![GitHub Repo stars](https://img.shields.io/github/stars/doanngocthanh/ApiGateWay?style=social)](https://github.com/doanngocthanh/ApiGateWay)
[![GitHub issues](https://img.shields.io/github/issues/doanngocthanh/ApiGateWay)](https://github.com/doanngocthanh/ApiGateWay/issues)
[![GitHub forks](https://img.shields.io/github/forks/doanngocthanh/ApiGateWay?style=social)](https://github.com/doanngocthanh/ApiGateWay/network/members)
## 📋 Quick Start Instructions

1. **Initialize project:**
```bash
mkdir api-management-service
cd api-management-service
npm init -y
npm install express express-rate-limit express-validator bcryptjs jsonwebtoken pg redis cors helmet morgan uuid axios dotenv
npm install --save-dev nodemon jest
```

2. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

3. **Start services:**
```bash
# With Docker
docker-compose up -d

# Or manually start PostgreSQL and Redis, then:
npm run dev
```

4. **Initialize database:**
```bash
psql -h localhost -U postgres -d api_management -f migrations/init.sql