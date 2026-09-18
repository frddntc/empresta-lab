import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Inbox } from 'lucide-react'
import api from '../api/client'

interface ClienteInfo {
  id: number
  nome: string
  email: string
  telefone: string
  matricula: string
}

interface Emprestimo {
  id: number
  nome_equipamento: string
  quantidade: number
  data_emprestimo: string
  prazo_devolucao: string
  devolvido: boolean
  cliente: ClienteInfo | null
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function MeusEmprestimos() {
  const navigate = useNavigate()
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Emprestimo[]>('/emprestimos/me')
      .then(({ data }) => setEmprestimos(data))
      .catch(() => setErro('Não foi possível carregar seus empréstimos. Tente novamente.'))
      .finally(() => setCarregando(false))
  }, [])

  return (
    <section className="meus-page">
      <div className="meus-header">
        <h2>
          <ClipboardList size={24} aria-hidden="true" />
          Acompanhar empréstimos ativos
        </h2>
        {/* O "Voltar" só faz sentido com conteúdo para voltar dele; no estado
            vazio a própria página oferece o CTA "Ir para o chat". */}
        {emprestimos.length > 0 && (
          <button
            className="btn-ghost"
            onClick={() => navigate('/chat')}
            aria-label="Voltar para o chat com o assistente"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        )}
      </div>
      <p className="meus-subtitle">
        Aqui aparecem os empréstimos que você solicitou pelo assistente e ainda não devolveu.
      </p>

      {erro && (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="meus-subtitle">Carregando...</p>
      ) : emprestimos.length === 0 ? (
        <div className="empty-state" role="status">
          <Inbox size={40} aria-hidden="true" />
          <h3>Você não tem nenhum empréstimo ativo</h3>
          <p>
            Quando você solicitar um equipamento pelo assistente virtual, ele aparecerá nesta
            lista com o prazo de devolução.
          </p>
          <Link to="/chat" className="btn-primary" style={{ textDecoration: 'none', marginTop: '0.75rem' }}>
            Ir para o chat
          </Link>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Quantidade</th>
                <th>Retirada</th>
                <th>Prazo de devolução</th>
              </tr>
            </thead>
            <tbody>
              {emprestimos.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.nome_equipamento}</strong>
                  </td>
                  <td>{emp.quantidade}</td>
                  <td>{formatarData(emp.data_emprestimo)}</td>
                  <td>
                    <span className="status-badge status-prazo">
                      {formatarData(emp.prazo_devolucao)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
