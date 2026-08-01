#!/bin/bash

echo "🔍 VÉRIFICATION ET CORRECTION DES FICHIERS TYPESCRIPT..."

cd /root/.openclaw/workspace/boubaia-clean

# Liste des fichiers à vérifier
FILES=$(find src -name "*.tsx" -o -name "*.ts")

for file in $FILES; do
    echo "=== Vérification de $file ==="
    
    # Vérifier la syntaxe avec TypeScript compiler
    npx tsc --noEmit --jsx react-jsx "$file" 2>/tmp/tsc_error.log
    
    if [ $? -ne 0 ]; then
        echo "❌ Erreur de syntaxe détectée dans $file"
        echo "--- Détails de l'erreur ---"
        cat /tmp/tsc_error.log
        echo "--- Fin des détails ---"
        
        # Essayer de réparer les fichiers connus comme corrompus
        if [[ "$file" == *"SettingsPage.tsx" ]]; then
            echo "🔄 Réparation de SettingsPage.tsx..."
            cp src/pages/admin/SettingsPage-fixed.tsx src/pages/admin/SettingsPage.tsx
        elif [[ "$file" == *"InvoicesPage.tsx" ]]; then
            echo "🔄 Réparation de InvoicesPage.tsx..."
            cp src/pages/admin/InvoicesPage-fixed.tsx src/pages/admin/InvoicesPage.tsx
        fi
    else
        echo "✅ $file - Syntaxe OK"
    fi
    
    echo ""
done

echo "✅ Vérification terminée !"
echo ""
echo "🚀 Redémarrage recommandé du serveur Vite :"
echo "1. Arrêter le serveur : pkill -f 'vite'"
echo "2. Redémarrer : npm run dev"