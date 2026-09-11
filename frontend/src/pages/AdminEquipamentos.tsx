import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

interface Equipamento {
  id: number
  nome: string
  descricao: string | null
  categoria: string
  quantidade: number
}

export default function AdminEquipamentos() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [quantidade, setQuantidade] = useState<number>(1)

  const { logout } = useAuth()

  const carregarEquipamentos = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      const res = await api.get('/equipamentos')
      setEquipamentos(res.data)
    } catch (err) {
      setErro('Erro ao buscar equipamentos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarEquipamentos()
  }, [carregarEquipamentos])

  function abrirModalNovo() {
    setEditandoId(null)
    setNome('')
    setDescricao('')
    setCategoria('')
    setQuantidade(1)
    setModalAberto(true)
  }

  function abrirModalEditar(eq: Equipamento) {
    setEditandoId(eq.id)
    setNome(eq.nome)
    setDescricao(eq.descricao || '')
    setCategoria(eq.categoria)
    setQuantidade(eq.quantidade)
    setModalAberto(true)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    if (quantidade < 0) {
      setErro('A quantidade não pode ser negativa.')
      return
    }
    setSalvando(true)
    setErro(null)

    try {
      const payload = { nome, descricao: descricao || null, categoria, quantidade: Number(quantidade) }
      if (editandoId) {
        await api.put(`/equipamentos/${editandoId}`, payload)
      } else {
        await api.post('/equipamentos', payload)
      }
      setModalAberto(false)
      await carregarEquipamentos()
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao salvar equipamento.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!window.confirm('Tem certeza que deseja remover este equipamento do catálogo?')) return
    setErro(null)
    try {
      await api.delete(`/equipamentos/${id}`)
      setEquipamentos((atual) => atual.filter((eq) => eq.id !== id))
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao excluir equipamento.')
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-header">
        <h2>Gestão de Estoque — Equipamentos</h2>
        <div className="admin-header-actions">
          <Link to="/admin" className="btn-ghost">
            Ver Empréstimos
          </Link>
          <button className="btn-ghost" onClick={logout} aria-label="Sair da conta">
            Sair
          </button>
        </div>
      </header>

      <div>
        <button className="btn-primary btn-novo-equipamento" onClick={abrirModalNovo}>
          <Plus size={18} />
          Novo Equipamento
        </button>
      </div>

      {erro && (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      )}

      {carregando ? (
        <p>Carregando catálogo...</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Disponível</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map((eq) => (
                <tr key={eq.id}>
                  <td>#{eq.id}</td>
                  <td>
                    <strong>{eq.nome}</strong>
                  </td>
                  <td>{eq.categoria}</td>
                  <td className="cell-descricao">{eq.descricao || '-'}</td>
                  <td>{eq.quantidade} un.</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-ghost btn-small" onClick={() => abrirModalEditar(eq)}>
                        <Pencil size={15} />
                        Editar
                      </button>
                      <button className="btn-ghost btn-small btn-danger" onClick={() => handleExcluir(eq.id)}>
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={editandoId ? 'Editar Equipamento' : 'Novo Equipamento'}>
          <div className="modal-card">
            <h3>{editandoId ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
            <form className="auth-form" onSubmit={handleSalvar} noValidate>
              <div className="form-field">
                <label htmlFor="eq-nome">Nome</label>
                <input
                  id="eq-nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="eq-categoria">Categoria</label>
                <input
                  id="eq-categoria"
                  type="text"
                  required
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="eq-quantidade">Quantidade em Estoque</label>
                <input
                  id="eq-quantidade"
                  type="number"
                  min="0"
                  required
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="eq-descricao">Descrição</label>
                <textarea
                  id="eq-descricao"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setModalAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
