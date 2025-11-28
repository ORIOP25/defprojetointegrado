import pandas as pd
from sqlalchemy import inspect
from app.db.database import engine  # Importamos o motor já configurado na Fase 1


def export_to_excel(output_file="EscolaPublica_Export.xlsx"):
    print("🔄 A iniciar exportação para Excel...")

    try:
        # 1. Obter lista de tabelas usando o Inspector do SQLAlchemy
        inspector = inspect(engine)
        tabelas = inspector.get_table_names()

        if not tabelas:
            print("❌ Nenhuma tabela encontrada na base de dados.")
            return

        print(f"📊 Tabelas encontradas: {len(tabelas)}")

        # 2. Criar o ficheiro Excel
        with pd.ExcelWriter(output_file, engine="openpyxl", date_format="YYYY-MM-DD") as writer:
            for tabela in tabelas:
                try:
                    # O Pandas lê diretamente do SQLAlchemy (muito mais simples!)
                    df = pd.read_sql_table(tabela, con=engine)

                    # Lógica de formatação de datas (mantendo a tua lógica original)
                    for col in df.columns:
                        # Verifica se é tipo datetime ou se o nome sugere data
                        if pd.api.types.is_datetime64_any_dtype(
                                df[col]) or "data" in col.lower() or "nasc" in col.lower():
                            # Converte para datetime seguro e depois formata
                            df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime("%Y-%m-%d")

                    # Excel limita nomes de sheets a 31 caracteres
                    sheet_name = tabela[:31]

                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    print(f"   ✅ Tabela '{tabela}' exportada ({len(df)} linhas)")

                except Exception as e_table:
                    print(f"   ⚠️  Erro ao exportar tabela '{tabela}': {e_table}")

        print(f"\n🚀 Exportação concluída com sucesso: {output_file}")

    except Exception as ex:
        print(f"❌ Erro crítico na exportação: {ex}")


# ======================================================
# EXECUÇÃO DIRETA
# ======================================================
if __name__ == "__main__":
    export_to_excel()
    export_to_excel()