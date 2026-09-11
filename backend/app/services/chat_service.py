from typing import Any
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from app.core.config import GEMINI_API_KEY
from app.models.estoque import Equipamento
from app.models.emprestimos import Cliente
from app.services.emprestimo_service import registrar_emprestimo
from app.schemas.emprestimo import EmprestimoCreate
from app.schemas.chat import ChatMessage

SYSTEM_PROMPT = """Você é o assistente virtual do Empresta Lab, sistema de empréstimo de equipamentos de laboratório.
Responda SEMPRE em português do Brasil, de forma cordial e objetiva.

Fluxo obrigatório que você deve seguir:
1. Quando o cliente informar o equipamento e quantidade desejada, chame a ferramenta `verificar_disponibilidade`.
2. Se a ferramenta indicar que o equipamento não está disponível ou a quantidade solicitada for maior que o estoque, peça desculpas educadamente pela falta do equipamento e informe a quantidade disponível (se houver).
3. Se houver disponibilidade suficiente, informe ao cliente e pergunte claramente se ele deseja prosseguir com o empréstimo.
4. Se o cliente responder negativamente ou não quiser continuar, agradeça cordialmente o contato e encerre o atendimento.
5. Se o cliente confirmar que deseja prosseguir, solicite os seguintes dados: nome completo, e-mail, telefone e matrícula/RA.
6. Assim que o cliente fornecer todos os dados, chame a ferramenta `registrar_emprestimo`.
7. Após o registro bem-sucedido, confirme o empréstimo ao cliente, informando o prazo de devolução de 30 dias.

Regras fundamentais:
- NUNCA afirme que há equipamento disponível sem antes chamar `verificar_disponibilidade`.
- Não trate de temas alheios ao controle e empréstimo de ferramentas do laboratório.
"""

tools_declarations = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="verificar_disponibilidade",
                description="Verifica se um equipamento de laboratório está disponível no estoque e retorna a quantidade atual.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "nome_equipamento": types.Schema(
                            type="STRING",
                            description="Nome do equipamento a ser consultado (busca aproximada)."
                        ),
                        "quantidade": types.Schema(
                            type="INTEGER",
                            description="Quantidade solicitada pelo cliente."
                        ),
                    },
                    required=["nome_equipamento", "quantidade"],
                ),
            ),
            types.FunctionDeclaration(
                name="registrar_emprestimo",
                description="Efetua o empréstimo do equipamento, subtrai a quantidade do estoque e registra os dados do cliente.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "equipamento_id": types.Schema(
                            type="INTEGER",
                            description="ID do equipamento retornado na verificação de estoque."
                        ),
                        "quantidade": types.Schema(
                            type="INTEGER",
                            description="Quantidade a ser emprestada."
                        ),
                        "nome": types.Schema(
                            type="STRING",
                            description="Nome completo do cliente."
                        ),
                        "email": types.Schema(
                            type="STRING",
                            description="E-mail do cliente."
                        ),
                        "telefone": types.Schema(
                            type="STRING",
                            description="Telefone de contato."
                        ),
                        "matricula": types.Schema(
                            type="STRING",
                            description="Matrícula ou RA do cliente."
                        ),
                        "prazo_dias": types.Schema(
                            type="INTEGER",
                            description="Prazo do empréstimo em dias (padrão: 30)."
                        ),
                    },
                    required=["equipamento_id", "quantidade", "nome", "email", "telefone", "matricula"],
                ),
            ),
        ]
    )
]


def _executar_verificar_disponibilidade(args: dict[str, Any], estoque_db: Session) -> dict[str, Any]:
    nome = str(args.get("nome_equipamento", "")).strip().lower()
    quantidade = int(args.get("quantidade", 1))

    equipamento = estoque_db.query(Equipamento).filter(
        Equipamento.nome.ilike(f"%{nome}%")
    ).first()

    if not equipamento:
        return {
            "encontrado": False,
            "disponivel": False,
            "quantidade_disponivel": 0,
            "mensagem": f"Equipamento '{nome}' não foi encontrado no catálogo.",
        }

    disponivel = equipamento.quantidade >= quantidade
    return {
        "encontrado": True,
        "equipamento_id": equipamento.id,
        "nome": equipamento.nome,
        "quantidade_disponivel": equipamento.quantidade,
        "disponivel": disponivel,
        "mensagem": "Equipamento disponível." if disponivel else "Quantidade em estoque insuficiente.",
    }


def _executar_registrar_emprestimo(args: dict[str, Any], estoque_db: Session, emprestimos_db: Session) -> dict[str, Any]:
    try:
        dto = EmprestimoCreate(
            equipamento_id=int(args["equipamento_id"]),
            quantidade=int(args["quantidade"]),
            nome=str(args["nome"]),
            email=str(args["email"]),
            telefone=str(args["telefone"]),
            matricula=str(args["matricula"]),
            prazo_dias=int(args.get("prazo_dias", 30)),
        )
        emprestimo = registrar_emprestimo(dto, estoque_db, emprestimos_db)
        return {
            "sucesso": True,
            "emprestimo_id": emprestimo.id,
            "equipamento": emprestimo.nome_equipamento,
            "quantidade": emprestimo.quantidade,
            "prazo_devolucao": str(emprestimo.prazo_devolucao),
            "mensagem": "Empréstimo registrado com sucesso.",
        }
    except Exception as err:
        return {
            "sucesso": False,
            "mensagem": f"Falha ao registrar empréstimo: {str(err)}",
        }


def processar_chat(
    message: str,
    history: list[ChatMessage],
    estoque_db: Session,
    emprestimos_db: Session,
) -> str:
    client = genai.Client(api_key=GEMINI_API_KEY or "dummy_key")

    contents: list[types.Content] = []
    for msg in history:
        contents.append(
            types.Content(
                role="user" if msg.role == "user" else "model",
                parts=[types.Part.from_text(text=msg.text)],
            )
        )

    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)],
        )
    )

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=tools_declarations,
        temperature=0.2,
    )

    while True:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=contents,
            config=config,
        )

        candidate = response.candidates[0]
        content = candidate.content
        contents.append(content)

        function_calls = [part.function_call for part in content.parts if part.function_call]
        if not function_calls:
            text_parts = [part.text for part in content.parts if part.text]
            return "".join(text_parts).strip() or "Atendimento concluído."

        response_parts: list[types.Part] = []
        for fc in function_calls:
            args = dict(fc.args) if fc.args else {}
            if fc.name == "verificar_disponibilidade":
                resultado = _executar_verificar_disponibilidade(args, estoque_db)
            elif fc.name == "registrar_emprestimo":
                resultado = _executar_registrar_emprestimo(args, estoque_db, emprestimos_db)
            else:
                resultado = {"erro": f"Função desconhecida: {fc.name}"}

            response_parts.append(
                types.Part.from_function_response(
                    name=fc.name,
                    response={"result": resultado},
                )
            )

        contents.append(
            types.Content(
                role="user",
                parts=response_parts,
            )
        )
