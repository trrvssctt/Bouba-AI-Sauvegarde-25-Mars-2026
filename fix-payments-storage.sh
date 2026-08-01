#!/bin/bash
# Correction rapide pour PaymentsPage.tsx et StoragePage.tsx

echo "🔧 Correction des pages Payments et Storage..."

# Fonction pour corriger une page
fix_page() {
    local page=$1
    local feature_name=$2
    local feature_desc=$3
    local required_plan=$4
    local icon=$5
    
    echo "📝 Correction de $page..."
    
    # Créer une version corrigée
    sed -i "s/if (!hasFeatureAccess('[^']*')) {/const [checkingAccess, setCheckingAccess] = useState(true)\n  const [hasAccess, setHasAccess] = useState<boolean | null>(null)\n  \n  \/\/ Vérifier l'accès au plan - dans un useEffect\n  useEffect(() => {\n    \/\/ Toujours exécuter, même si hasFeatureAccess est undefined\n    const access = hasFeatureAccess ? hasFeatureAccess('calendar') : false\n    setHasAccess(access)\n    setCheckingAccess(false)\n  }, [profile, hasFeatureAccess])/" "src/pages/$page"
    
    # Modifier le useEffect de chargement
    sed -i "s/useEffect(() => {/useEffect(() => {\n    if (hasAccess !== true) return \/\/ Ne pas charger si pas d'accès/" "src/pages/$page"
    
    # Ajouter le rendu conditionnel avant le return final
    sed -i "/^  return (/i \  \/\/ Rendu conditionnel\n  if (checkingAccess) {\n    return (\n      <div className=\"min-h-screen flex items-center justify-center\">\n        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary\"><\/div>\n      <\/div>\n    )\n  }\n  \n  if (hasAccess === false) {\n    return (\n      <LockedFeaturePage\n        featureName=\"$feature_name\"\n        featureDescription=\"$feature_desc\"\n        requiredPlan=\"$required_plan\"\n        currentPlan={profile?.plan_id}\n        icon={$icon}\n      \/>\n    )\n  }\n" "src/pages/$page"
    
    echo "   ✅ $page corrigé"
}

# Corriger PaymentsPage.tsx
fix_page "PaymentsPage.tsx" "Paiements (Stripe/PayPal)" "Gérez vos transactions, abonnements et factures avec Stripe et PayPal." "premium" "<CreditCard className=\"w-12 h-12\" />"

# Corriger StoragePage.tsx  
fix_page "StoragePage.tsx" "Stockage Cloud (Dropbox/Drive)" "Stockez, synchronisez et partagez vos fichiers dans le cloud avec Dropbox et Google Drive." "premium" "<Folder className=\"w-12 h-12\" />"

echo ""
echo "🎉 Corrections appliquées !"
echo "Redémarrez le frontend : pkill -f vite && cd /root/.openclaw/workspace/boubaia-clean && nohup npm run dev &"