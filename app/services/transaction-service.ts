// 交易數據類型
export interface Transaction {
  id: string
  category: string
  icon: string
  amount: number
  date: string
  type: "expense" | "income"
  asset: string
  accountBook: string
  note: string
  excludeFromStats: boolean
  recordTime: string
}

// 模擬數據庫
const mockTransactions: Transaction[] = [
  {
    id: "1",
    category: "餐饮",
    icon: "🍔",
    amount: -28.0,
    date: "2025年07月06日",
    type: "expense",
    asset: "現金",
    accountBook: "默认账本",
    note: "吃饭",
    excludeFromStats: false,
    recordTime: "2025年03月06日 11:48",
  },
  {
    id: "2",
    category: "交通",
    icon: "🚗",
    amount: -50.0,
    date: "2025年07月05日",
    type: "expense",
    asset: "信用卡",
    accountBook: "默认账本",
    note: "加油",
    excludeFromStats: false,
    recordTime: "2025年03月05日 10:30",
  },
]

// 獲取交易詳情
export async function getTransactionById(id: string): Promise<Transaction | null> {
  // 在實際應用中，這裡應該調用後端 API
  await new Promise((resolve) => setTimeout(resolve, 500)) // 模擬網絡延遲

  const transaction = mockTransactions.find((t) => t.id === id)
  return transaction || null
}

// 更新交易
export async function updateTransaction(transaction: Transaction): Promise<boolean> {
  // 在實際應用中，這裡應該調用後端 API
  await new Promise((resolve) => setTimeout(resolve, 500)) // 模擬網絡延遲

  const index = mockTransactions.findIndex((t) => t.id === transaction.id)
  if (index !== -1) {
    mockTransactions[index] = transaction
    return true
  }
  return false
}

// 刪除交易
export async function deleteTransaction(id: string): Promise<boolean> {
  // 在實際應用中，這裡應該調用後端 API
  await new Promise((resolve) => setTimeout(resolve, 500)) // 模擬網絡延遲

  const index = mockTransactions.findIndex((t) => t.id === id)
  if (index !== -1) {
    mockTransactions.splice(index, 1)
    return true
  }
  return false
}

// 獲取所有交易
export async function getAllTransactions(): Promise<Transaction[]> {
  // 在實際應用中，這裡應該調用後端 API
  await new Promise((resolve) => setTimeout(resolve, 500)) // 模擬網絡延遲

  return [...mockTransactions]
}

