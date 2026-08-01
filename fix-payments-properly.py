#!/usr/bin/env python3
import re

def fix_payments_page():
    with open('src/pages/PaymentsPage.tsx', 'r') as f:
        content = f.read()
    
    # Trouver la fonction PaymentsPage
    lines = content.split('\n')
    
    # Chercher la ligne avec "if (!hasFeatureAccess('finance')) {"
    for i, line in enumerate(lines):
        if "if (!hasFeatureAccess('finance')) {" in line:
            start_line = i
            break
    else:
        print("❌ Ligne non trouvée")
        return
    
    # Trouver la fin du bloc if (jusqu'à })
    brace_count = 0
    for j in range(start_line, len(lines)):
        if '{' in lines[j]:
            brace_count += 1
        if '}' in lines[j]:
            brace_count -= 1
            if brace_count == 0:
                end_line = j
                break
    
    # Remplacer le bloc if par la nouvelle structure
    new_lines = []
    for i in range(len(lines)):
        if i == start_line:
            # Ajouter les nouveaux états
            new_lines.append("  const [checkingAccess, setCheckingAccess] = useState(true)")
            new_lines.append("  const [hasAccess, setHasAccess] = useState<boolean | null>(null)")
            new_lines.append("  ")
            new_lines.append("  // Vérifier l'accès au plan - dans un useEffect")
            new_lines.append("  useEffect(() => {")
            new_lines.append("    // Toujours exécuter, même si hasFeatureAccess est undefined")
            new_lines.append("    const access = hasFeatureAccess ? hasFeatureAccess('finance') : false")
            new_lines.append("    setHasAccess(access)")
            new_lines.append("    setCheckingAccess(false)")
            new_lines.append("  }, [profile, hasFeatureAccess])")
        elif start_line < i <= end_line:
            # Ignorer les lignes du vieux bloc if
            continue
        else:
            new_lines.append(lines[i])
    
    # Maintenant, trouver le useEffect de chargement des données
    content2 = '\n'.join(new_lines)
    lines2 = content2.split('\n')
    
    for i, line in enumerate(lines2):
        if "useEffect(() => {" in line and "// Simuler le chargement des données" in lines2[i-1]:
            # Insérer la condition
            lines2.insert(i+1, "    if (hasAccess !== true) return // Ne pas charger si pas d'accès")
            break
    
    # Trouver le return final et insérer le rendu conditionnel avant
    for i, line in enumerate(lines2):
        if line.strip() == "return (" and "// Obtenir la couleur de la méthode" in lines2[i-2]:
            # Insérer le rendu conditionnel avant ce return
            conditional_render = [
                "  // Rendu conditionnel",
                "  if (checkingAccess) {",
                "    return (",
                "      <div className=\"min-h-screen flex items-center justify-center\">",
                "        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary\"></div>",
                "      </div>",
                "    )",
                "  }",
                "  ",
                "  if (hasAccess === false) {",
                "    return (",
                "      <LockedFeaturePage",
                "        featureName=\"Paiements (Stripe/PayPal)\"",
                "        featureDescription=\"Gérez vos paiements, factures, abonnements récurrents et transactions avec Stripe, PayPal et Mobile Money.\"",
                "        requiredPlan=\"premium\"",
                "        currentPlan={profile?.plan_id}",
                "        icon={<CreditCard className=\"w-12 h-12\" />}",
                "      />",
                "    )",
                "  }",
                "  "
            ]
            
            # Insérer avant le return
            lines2 = lines2[:i] + conditional_render + lines2[i:]
            break
    
    # Écrire le fichier corrigé
    with open('src/pages/PaymentsPage.tsx', 'w') as f:
        f.write('\n'.join(lines2))
    
    print("✅ PaymentsPage.tsx corrigé")

def fix_storage_page():
    with open('src/pages/StoragePage.tsx', 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # Chercher la ligne avec "if (!hasFeatureAccess('finance')) {"
    for i, line in enumerate(lines):
        if "if (!hasFeatureAccess('finance')) {" in line:
            start_line = i
            break
    else:
        print("❌ Ligne non trouvée dans StoragePage")
        return
    
    # Trouver la fin du bloc if
    brace_count = 0
    for j in range(start_line, len(lines)):
        if '{' in lines[j]:
            brace_count += 1
        if '}' in lines[j]:
            brace_count -= 1
            if brace_count == 0:
                end_line = j
                break
    
    # Remplacer le bloc if
    new_lines = []
    for i in range(len(lines)):
        if i == start_line:
            new_lines.append("  const [checkingAccess, setCheckingAccess] = useState(true)")
            new_lines.append("  const [hasAccess, setHasAccess] = useState<boolean | null>(null)")
            new_lines.append("  ")
            new_lines.append("  // Vérifier l'accès au plan - dans un useEffect")
            new_lines.append("  useEffect(() => {")
            new_lines.append("    // Toujours exécuter, même si hasFeatureAccess est undefined")
            new_lines.append("    const access = hasFeatureAccess ? hasFeatureAccess('finance') : false")
            new_lines.append("    setHasAccess(access)")
            new_lines.append("    setCheckingAccess(false)")
            new_lines.append("  }, [profile, hasFeatureAccess])")
        elif start_line < i <= end_line:
            continue
        else:
            new_lines.append(lines[i])
    
    # Modifier le useEffect de chargement
    content2 = '\n'.join(new_lines)
    lines2 = content2.split('\n')
    
    for i, line in enumerate(lines2):
        if "useEffect(() => {" in line and "// Simuler le chargement des données" in lines2[i-1]:
            lines2.insert(i+1, "    if (hasAccess !== true) return // Ne pas charger si pas d'accès")
            break
    
    # Trouver le return final
    for i, line in enumerate(lines2):
        if line.strip() == "return (" and "// Obtenir la couleur du type" in lines2[i-2]:
            conditional_render = [
                "  // Rendu conditionnel",
                "  if (checkingAccess) {",
                "    return (",
                "      <div className=\"min-h-screen flex items-center justify-center\">",
                "        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary\"></div>",
                "      </div>",
                "    )",
                "  }",
                "  ",
                "  if (hasAccess === false) {",
                "    return (",
                "      <LockedFeaturePage",
                "        featureName=\"Stockage Cloud (Dropbox/Drive)\"",
                "        featureDescription=\"Stockez, synchronisez et partagez vos fichiers dans le cloud avec Dropbox et Google Drive.\"",
                "        requiredPlan=\"premium\"",
                "        currentPlan={profile?.plan_id}",
                "        icon={<Folder className=\"w-12 h-12\" />}",
                "      />",
                "    )",
                "  }",
                "  "
            ]
            
            lines2 = lines2[:i] + conditional_render + lines2[i:]
            break
    
    with open('src/pages/StoragePage.tsx', 'w') as f:
        f.write('\n'.join(lines2))
    
    print("✅ StoragePage.tsx corrigé")

if __name__ == "__main__":
    print("🔧 Correction des pages Payments et Storage...")
    fix_payments_page()
    fix_storage_page()
    print("🎉 Corrections terminées !")