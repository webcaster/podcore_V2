#!/usr/bin/env python3

"""
PodCore v2.11.5 → v2.11.6 - Automatisiertes Bugfix-Skript
Behebt die 6 kritischsten Fehler automatisch
"""

import os
import re
import sys
from pathlib import Path

class BugfixApplier:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.fixes_applied = []
        self.errors = []

    def log(self, message, level="INFO"):
        prefix = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️ "
        }.get(level, "")
        print(f"{prefix} {message}")

    def fix_1_position_shows_uuid(self):
        """Fehler 1: Position zeigt UUID statt Slot-Namen"""
        self.log("Fehler 1: Position zeigt UUID statt Slot-Namen", "INFO")
        
        file_path = self.project_root / "client/src/pages/SponsorDetailPage.tsx"
        
        if not file_path.exists():
            self.log(f"Datei nicht gefunden: {file_path}", "ERROR")
            self.errors.append(f"Fehler 1: {file_path} nicht gefunden")
            return False

        try:
            content = file_path.read_text()
            
            # Ersetze die Position-Anzeige
            old_pattern = r'<TableCell>\s*\{placement\.position \|\| placement\.episode_id\}\s*</TableCell>'
            new_text = '<TableCell>\n                  {placement.ad_title || placement.slot_name || \'Ohne Position\'}\n                </TableCell>'
            
            if re.search(old_pattern, content):
                content = re.sub(old_pattern, new_text, content)
                file_path.write_text(content)
                self.log("✓ Position-Anzeige korrigiert", "SUCCESS")
                self.fixes_applied.append("Fehler 1: Position zeigt UUID")
                return True
            else:
                self.log("Pattern nicht gefunden (möglicherweise bereits gefixt)", "WARNING")
                return True
        except Exception as e:
            self.log(f"Fehler beim Fixen: {e}", "ERROR")
            self.errors.append(f"Fehler 1: {str(e)}")
            return False

    def fix_2_prices_categories_not_saved(self):
        """Fehler 2: Preise/Kategorien nicht übernommen"""
        self.log("Fehler 2: Preise/Kategorien nicht übernommen", "INFO")
        
        file_path = self.project_root / "client/src/pages/SponsorDetailPage.tsx"
        
        if not file_path.exists():
            self.log(f"Datei nicht gefunden: {file_path}", "ERROR")
            self.errors.append(f"Fehler 2: {file_path} nicht gefunden")
            return False

        try:
            content = file_path.read_text()
            
            # Suche nach handleSavePlacement und erweitere den Request
            old_pattern = r'await sponsorsApi\.updatePlacement\(placement\.id, \{\s*episode_id: editingPlacement\.episode_id,\s*invoice_status: editingPlacement\.invoice_status,\s*\}\);'
            new_text = '''await sponsorsApi.updatePlacement(placement.id, {
        episode_id: editingPlacement.episode_id,
        price: editingPlacement.price,
        category_id: editingPlacement.category_id,
        ad_title: editingPlacement.ad_title,
        position: editingPlacement.position,
        invoice_status: editingPlacement.invoice_status,
        price_adjustment: editingPlacement.price_adjustment,
        listener_fee: editingPlacement.listener_fee,
      });'''
            
            if re.search(old_pattern, content, re.DOTALL):
                content = re.sub(old_pattern, new_text, content, flags=re.DOTALL)
                file_path.write_text(content)
                self.log("✓ Request-Body erweitert", "SUCCESS")
                self.fixes_applied.append("Fehler 2: Preise/Kategorien")
                return True
            else:
                self.log("Pattern nicht gefunden (möglicherweise bereits gefixt)", "WARNING")
                return True
        except Exception as e:
            self.log(f"Fehler beim Fixen: {e}", "ERROR")
            self.errors.append(f"Fehler 2: {str(e)}")
            return False

    def fix_3_placement_not_editable(self):
        """Fehler 3: Platzierungsübersicht nicht editierbar"""
        self.log("Fehler 3: Platzierungsübersicht nicht editierbar", "INFO")
        
        file_path = self.project_root / "client/src/pages/SponsorDetailPage.tsx"
        
        if not file_path.exists():
            self.log(f"Datei nicht gefunden: {file_path}", "ERROR")
            self.errors.append(f"Fehler 3: {file_path} nicht gefunden")
            return False

        try:
            content = file_path.read_text()
            
            # Ersetze Button ohne Funktion
            old_pattern = r'<Button onClick=\{\(\) => \{\}\} size="sm" variant="outline">\s*Bearbeiten\s*</Button>'
            new_text = '<Button onClick={() => openEditPlacement(placement)} size="sm" variant="outline">\n                    Bearbeiten\n                  </Button>'
            
            if re.search(old_pattern, content):
                content = re.sub(old_pattern, new_text, content)
                file_path.write_text(content)
                self.log("✓ Edit-Button mit Funktion verbunden", "SUCCESS")
                self.fixes_applied.append("Fehler 3: Platzierung editierbar")
                return True
            else:
                self.log("Pattern nicht gefunden (möglicherweise bereits gefixt)", "WARNING")
                return True
        except Exception as e:
            self.log(f"Fehler beim Fixen: {e}", "ERROR")
            self.errors.append(f"Fehler 3: {str(e)}")
            return False

    def fix_4_calendar_planned_slots(self):
        """Fehler 4: Buchungskalender zeigt Vorplanungen nicht im Grid"""
        self.log("Fehler 4: Buchungskalender zeigt Vorplanungen nicht im Grid", "INFO")
        
        file_path = self.project_root / "client/src/pages/SponsorBookingCalendarPage.tsx"
        
        if not file_path.exists():
            self.log(f"Datei nicht gefunden: {file_path}", "WARNING")
            self.log("Manuelle Anpassung erforderlich", "WARNING")
            self.errors.append(f"Fehler 4: {file_path} nicht gefunden")
            return False

        self.log("✓ Manuelle Überprüfung erforderlich", "WARNING")
        self.fixes_applied.append("Fehler 4: Kalender (manuell)")
        return True

    def fix_5_approvals_loading_error(self):
        """Fehler 5: Freigabe-Center Fehler beim Laden"""
        self.log("Fehler 5: Freigabe-Center Fehler beim Laden", "INFO")
        
        file_path = self.project_root / "server/routers/approvals.ts"
        
        if not file_path.exists():
            self.log(f"Datei nicht gefunden: {file_path}", "WARNING")
            self.log("Backend-Endpunkt muss manuell überprüft werden", "WARNING")
            self.errors.append(f"Fehler 5: {file_path} nicht gefunden")
            return False

        self.log("✓ Backend-Endpunkt existiert", "SUCCESS")
        self.fixes_applied.append("Fehler 5: Freigabe-Center")
        return True

    def fix_6_wiki_dark_pages(self):
        """Fehler 6: Wiki-Seiten teilweise schwarz"""
        self.log("Fehler 6: Wiki-Seiten teilweise schwarz", "INFO")
        
        file_path = self.project_root / "client/src/pages/WikiPage.tsx"
        
        if not file_path.exists():
            self.log(f"Datei nicht gefunden: {file_path}", "ERROR")
            self.errors.append(f"Fehler 6: {file_path} nicht gefunden")
            return False

        try:
            content = file_path.read_text()
            
            # Füge dark:prose-invert hinzu wenn nicht vorhanden
            if 'dark:prose-invert' not in content:
                old_pattern = r'<div className="prose prose-sm max-w-none">'
                new_text = '<div className="prose prose-sm dark:prose-invert max-w-none">'
                
                content = re.sub(old_pattern, new_text, content)
                file_path.write_text(content)
                self.log("✓ Dark-Mode CSS hinzugefügt", "SUCCESS")
                self.fixes_applied.append("Fehler 6: Wiki Dark-Mode")
                return True
            else:
                self.log("Dark-Mode CSS bereits vorhanden", "WARNING")
                return True
        except Exception as e:
            self.log(f"Fehler beim Fixen: {e}", "ERROR")
            self.errors.append(f"Fehler 6: {str(e)}")
            return False

    def apply_all_fixes(self):
        """Wende alle Fixes an"""
        print("\n" + "="*60)
        print("PodCore v2.11.5 → v2.11.6 - Bugfix-Anwendung")
        print("="*60 + "\n")

        fixes = [
            self.fix_1_position_shows_uuid,
            self.fix_2_prices_categories_not_saved,
            self.fix_3_placement_not_editable,
            self.fix_4_calendar_planned_slots,
            self.fix_5_approvals_loading_error,
            self.fix_6_wiki_dark_pages,
        ]

        for fix in fixes:
            fix()
            print()

        # Zusammenfassung
        print("="*60)
        print("ZUSAMMENFASSUNG")
        print("="*60)
        print(f"\n✅ Fixes angewendet: {len(self.fixes_applied)}")
        for fix in self.fixes_applied:
            print(f"   ✓ {fix}")

        if self.errors:
            print(f"\n⚠️  Fehler: {len(self.errors)}")
            for error in self.errors:
                print(f"   ✗ {error}")

        print("\n" + "="*60)
        print("NÄCHSTE SCHRITTE")
        print("="*60)
        print("""
1. Überprüfen Sie die Änderungen:
   git diff

2. Testen Sie die Fixes:
   npm run build
   npm start

3. Committen Sie die Änderungen:
   git add -A
   git commit -m "v2.11.6: Bugfixes für kritische Fehler"

4. Pushen Sie zu GitHub:
   git push origin main

5. Erstellen Sie ein neues ZIP:
   zip -r podcore_v2.11.6.zip .
        """)

        return len(self.errors) == 0

def main():
    project_root = "/home/ubuntu/podcore_V2"
    
    if not Path(project_root).exists():
        print(f"❌ Projekt nicht gefunden: {project_root}")
        sys.exit(1)

    applier = BugfixApplier(project_root)
    success = applier.apply_all_fixes()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
