# Accountie MVP Dokümantasyon Paketi

Bu klasör, Accountie'nin üç günlük ofis içi MVP'sini geliştirmek için gereken ürün, teknik tasarım ve AI coding-agent talimatlarını içerir.

## Ana belgeler

- `PRD-Accountie-MVP.md`: Ne yapılacağını ve kabul kriterlerini tanımlar.
- `TechDesign-Accountie-MVP.md`: Nasıl geliştirileceğini, veri modelini ve kaynak toplama yaklaşımını tanımlar.
- `AGENTS.md`: Coding agent için ana çalışma talimatıdır.
- `MEMORY.md`: Aktif faz, sonraki iş ve engeller için kısa proje hafızasıdır.
- `REVIEW-CHECKLIST.md`: Bir değişikliğin tamamlanmış sayılması için kontrol listesidir.
- `agent_docs/`: Agent'ın ihtiyaç halinde okuyacağı kısa başvuru belgeleridir.
- `.codex/config.toml`: Codex'e özel, proje talimatlarının kaynağını belirten minimal yapılandırmadır.

## Önerilen kullanım

1. Bu klasörün içeriğini Accountie kod deposunun köküne kopyalayın.
2. Coding agent'a önce `AGENTS.md` ve `agent_docs/` klasörünü okutun.
3. `MEMORY.md` içindeki ilk işi uygulatarak başlayın.
4. Her faz sonunda `REVIEW-CHECKLIST.md` ile doğrulama yapın.

## Kapsam özeti

Accountie muhasebe kaydı tutmaz. Luca'nın yerine geçmez. GİB, SGK ve Resmî Gazete gibi resmî kaynaklardan takvim ve mevzuat bilgisi toplar; ofis ekibine yaklaşan süreleri, duyuruları, kişisel notları ve favorileri tek ekranda sunar.

