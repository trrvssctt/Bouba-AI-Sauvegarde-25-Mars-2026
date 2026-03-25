#!/bin/bash

echo "🚀 Test du processus d'inscription complet"
echo "========================================"

echo ""
echo "1️⃣ Test plan gratuit (Starter)"
echo "-------------------------------"

curl -X POST http://localhost:3001/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-starter@example.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "Starter",
        "plan_id": "starter",
        "subscription_status": "active",
        "company": "Test Company",
        "phone": "+33123456789",
        "website": "https://example.com"
    }'

echo ""
echo ""
echo "2️⃣ Test plan payant (Pro) - Simulation paiement validé"
echo "--------------------------------------------------------"

curl -X POST http://localhost:3001/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-pro@example.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "Pro",
        "plan_id": "pro",
        "subscription_status": "active",
        "company": "Pro Company",
        "phone": "+33987654321",
        "website": "https://pro.example.com"
    }'

echo ""
echo ""
echo "✅ Tests terminés!"
echo "Vérifiez les comptes créés dans votre base de données."