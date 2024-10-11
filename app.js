import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    const [month, setMonth] = useState('03');
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [statistics, setStatistics] = useState({});
    const [barChart, setBarChart] = useState({});
    const [pieChart, setPieChart] = useState({});

    useEffect(() => {
        fetchTransactions();
        fetchStatistics();
        fetchBarChart();
        fetchPieChart();
    }, [month, search, page]);

    const fetchTransactions = async () => {
        const response = await axios.get(`http://localhost:3000/api/transactions`, {
            params: { month, search, page }
        });
        setTransactions(response.data.records);
        setTotalRecords(response.data.total);
    };

    const fetchStatistics = async () => {
        const response = await axios.get(`http://localhost:3000/api/statistics`, { params: { month } });
        setStatistics(response.data);
    };

    const fetchBarChart = async () => {
        const response = await axios.get(`http://localhost:3000/api/bar-chart`, { params: { month } });
        setBarChart(response.data);
    };

    const fetchPieChart = async () => {
        const response = await axios.get(`http://localhost:3000/api/pie-chart`, { params: { month } });
        setPieChart(response.data);
    };

    return (
        <div>
            <h1>Transactions Dashboard</h1>
            <select onChange={e => setMonth(e.target.value)} value={month}>
                {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                ))}
            </select>
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search transactions..."
            />
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Date of Sale</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(transaction => (
                        <tr key={transaction._id}>
                            <td>{transaction.productTitle}</td>
                            <td>{transaction.productDescription}</td>
                            <td>{transaction.price}</td>
                            <td>{transaction.category}</td>
                            <td>{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={() => setPage(prev => Math.max(prev - 1, 1))}>Previous</button>
            <button onClick={() => setPage(prev => prev + 1)}>Next</button>
            <div>
                <h2>Statistics</h2>
                <p>Total Sale Amount: {statistics.totalSaleAmount}</p>
                <p>Total Sold Items: {statistics.totalSoldItems}</p>
                <p>Total Not Sold Items: {statistics.totalNotSoldItems}</p>
            </div>
            <div>
                <h2>Bar Chart Data</h2>
                <pre>{JSON.stringify(barChart, null, 2)}</pre>
            </div>
            <div>
                <h2>Pie Chart Data</h2>
                <pre>{JSON.stringify(pieChart, null, 2)}</pre>
            </div>
        </div>
    );
}

export default App;
