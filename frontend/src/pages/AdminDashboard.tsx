import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Undo2 } from 'lucide-react'
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
  cliente_id: number | null
  equipamento_id: number
  nome_equipamento: string
  quantidade: number
  data_emprestimo: string
  prazo_devolucao: string
  devolvido: boolean
  cliente: ClienteInfo | null
}

export default function AdminDashboard() {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [processandoId, setProcessandoId] = useState<number | null>(null)

  const carregarEmprestimos = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      const res = await api.get('/emprestimos')
      setEmprestimos(res.data)
    } catch (err) {
      setErro('Erro ao carregar lista de empréstimos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarEmprestimos()
  }, [carregarEmprestimos])

  async function handleDevolucao(id: number) {
    if (!window.confirm('Confirma o registro de devolução deste equipamento?')) return
    setProcessandoId(id)
    setMensagem(null)
    setErro(null)
    try {
      await api.put(`/emprestimos/${id}/devolver`)
      setMensagem('Devolução registrada com sucesso! Estoque restaurado.')
      setEmprestimos((atual) => atual.filter((item) => item.id !== id))
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao registrar devolução.')
    } finally {
      setProcessandoId(null)
    }
  }

  function isVencido(prazo: string) {
    const hoje = new Date().toISOString().split('T')[0]
    return prazo < hoje
  }

  return (
    <section className="admin-page">
      <header className="admin-header">
        <h2>Empréstimos Ativos</h2>
        <div className="admin-header-actions">
          <Link to="/admin/equipamentos" className="btn-ghost">
            <Boxes size={18} />
            Gerenciar Estoque
          </Link>
        </div>
      </header>

      {mensagem && (
        <div className="alert alert-success" role="status">
          {mensagem}
        </div>
      )}
      {erro && (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      )}

      {carregando ? (
        <p>Carregando empréstimos...</p>
      ) : emprestimos.length === 0 ? (
        <p>Nenhum empréstimo ativo no momento.</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Equipamento</th>
                <th>Qtd</th>
                <th>Data Empréstimo</th>
                <th>Prazo Devolução</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {emprestimos.map((emp) => {
                const vencido = isVencido(emp.prazo_devolucao)
                return (
                  <tr key={emp.id}>
                    <td className="cell-cliente">
                      {emp.cliente ? (
                        <>
                          <strong>{emp.cliente.nome}</strong>
                          <small className="cliente-detalhes">
                            {emp.cliente.matricula} · {emp.cliente.email} · {emp.cliente.telefone}
                          </small>
                        </>
                      ) : (
                        <small className="cliente-detalhes">Cliente removido da base</small>
                      )}
                    </td>
                    <td>
                      <strong>{emp.nome_equipamento}</strong>
                    </td>
                    <td>{emp.quantidade}</td>
                    <td>{emp.data_emprestimo}</td>
                    <td>{emp.prazo_devolucao}</td>
                    <td>
                      <span className={`status-badge ${vencido ? 'status-vencido' : 'status-prazo'}`}>
                        {vencido ? 'Vencido' : 'No Prazo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-primary btn-devolver"
                        onClick={() => handleDevolucao(emp.id)}
                        disabled={processandoId === emp.id}
                      >
                        <Undo2 size={16} />
                        {processandoId === emp.id ? 'Registrando...' : 'Baixar Devolução'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
