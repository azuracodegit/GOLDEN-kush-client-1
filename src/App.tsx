import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Plus, Minus, Edit2, Trash2, ShoppingBag, X, Gift } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from './supabaseClient';

interface Sale {
  id: string;
  customer_id: string;
  amount: number;
  date: string;
  products: string[];
}

interface Customer {
  id: string;
  name: string;
  created_at: string;
  total_spent: number;
  spent_since_last_gift: number;
  gifts_claimed: number;
  available_gifts: number;
  sales: Sale[];
}

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showSaleForm, setShowSaleForm] = useState<string | null>(null);
  const [newSale, setNewSale] = useState({ amount: '', products: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Charger les clients depuis Supabase au démarrage
  useEffect(() => {
    const fetchCustomers = async () => {
      console.log('Chargement des clients depuis Supabase...');
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erreur Supabase:', error);
        } else {
          console.log('Clients chargés:', data);
          const customersWithSales = data?.map(customer => ({
            ...customer,
            total_spent: parseFloat(customer.total_spent) || 0,
            spent_since_last_gift: parseFloat(customer.spent_since_last_gift) || 0,
            sales: []
          })) || [];
          setCustomers(customersWithSales);
        }
      } catch (err) {
        console.error('Erreur lors du chargement:', err);
      }
    };

    fetchCustomers();
  }, []);

  const addCustomer = async () => {
    if (newCustomerName.trim()) {
      console.log('Début de l\'ajout du client:', newCustomerName);
      try {
        const newCustomer = {
          id: crypto.randomUUID(),
          name: newCustomerName,
          total_spent: 0.0,
          spent_since_last_gift: 0.0,
          gifts_claimed: 0,
          available_gifts: 0
        };

        console.log('Envoi à Supabase:', newCustomer);

        const { data, error } = await supabase
          .from('customers')
          .insert([newCustomer])
          .select('*');

        if (error) {
          console.error('Erreur Supabase:', error);
          alert('Erreur lors de l\'ajout du client');
        } else {
          console.log('Réponse de Supabase:', data);
          if (data && data.length > 0) {
            const customerWithSales = {
              ...data[0],
              total_spent: parseFloat(data[0].total_spent) || 0,
              spent_since_last_gift: parseFloat(data[0].spent_since_last_gift) || 0,
              sales: []
            };
            setCustomers(prevCustomers => [...prevCustomers, customerWithSales]);
            setNewCustomerName('');
            setIsAddingCustomer(false);
            console.log('Client ajouté avec succès');
          } else {
            console.error('Aucune donnée retournée par Supabase');
            alert('Erreur: Aucune donnée retournée');
          }
        }
      } catch (err) {
        console.error('Erreur lors de l\'ajout:', err);
        alert('Erreur lors de l\'ajout du client');
      }
    } else {
      alert('Veuillez entrer un nom de client');
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ? Toutes ses ventes seront également supprimées.')) {
      try {
        // D'abord, supprimer toutes les ventes associées
        const { error: salesError } = await supabase
          .from('sales')
          .delete()
          .eq('customer_id', customerId);

        if (salesError) {
          console.error('Erreur lors de la suppression des ventes:', salesError);
          return;
        }

        // Ensuite, supprimer le client
        const { error: customerError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerId);

        if (customerError) {
          console.error('Erreur lors de la suppression du client:', customerError);
        } else {
          setCustomers(customers.filter(customer => customer.id !== customerId));
        }
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
      }
    }
  };

  function startEditingCustomer(customer: Customer) {
    setEditingCustomer(customer);
  }

  function saveCustomerEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;

    setCustomers(customers.map(customer => 
      customer.id === editingCustomer.id 
        ? { ...customer, name: editingCustomer.name }
        : customer
    ));
    setEditingCustomer(null);
  }

  const addSale = async (customerId: string, amount: number) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      try {
        const saleDate = new Date().toISOString();
        
        const { data: newSaleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            customer_id: customerId,
            amount: amount,
            date: saleDate,
            products: JSON.stringify(newSale.products ? newSale.products.split(',').map(p => p.trim()).filter(Boolean) : [])
          })
          .select('*')
          .single();

        if (saleError) {
          console.error('Erreur lors de l\'ajout de la vente:', saleError);
          return;
        }

        // 2. Mettre à jour le client
        const newSpentSinceLastGift = customer.spent_since_last_gift + amount;
        const newTotalSpent = customer.total_spent + amount;
        const newAvailableGifts = Math.floor(newSpentSinceLastGift / 150);

        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({
            total_spent: newTotalSpent,
            spent_since_last_gift: newSpentSinceLastGift,
            available_gifts: newAvailableGifts
          })
          .eq('id', customerId)
          .select()
          .single();

        if (updateError) {
          console.error('Erreur lors de la mise à jour du client:', updateError);
          return;
        }

        // 3. Mettre à jour l'interface
        if (updatedCustomer && newSaleData) {
          setCustomers(prevCustomers =>
            prevCustomers.map(c => {
              if (c.id === customerId) {
                return {
                  ...updatedCustomer,
                  total_spent: Number(updatedCustomer.total_spent),
                  spent_since_last_gift: Number(updatedCustomer.spent_since_last_gift),
                  sales: [...(c.sales || []), {
                    ...newSaleData,
                    products: JSON.parse(newSaleData.products || '[]')
                  }]
                };
              }
              return c;
            })
          );

          // 4. Réinitialiser le formulaire
          setNewSale({ amount: '', products: '' });
          setShowSaleForm(null);
        }
      } catch (err) {
        console.error('Erreur lors de l\'opération:', err);
      }
    }
  };

  // Charger les ventes au démarrage
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .order('date', { ascending: false });

        if (salesError) {
          console.error('Erreur lors du chargement des ventes:', salesError);
          return;
        }

        // Mettre à jour les clients avec leurs ventes
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => ({
            ...customer,
            sales: salesData?.filter(sale => sale.customer_id === customer.id) || []
          }))
        );
      } catch (err) {
        console.error('Erreur lors du chargement des ventes:', err);
      }
    };

    fetchSales();
  }, []);

  const deleteSale = async (customerId: string, saleId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const sale = customer.sales.find(s => s.id === saleId);
      if (sale && window.confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
        try {
          // Supprimer la vente de la table sales
          const { error: deleteError } = await supabase
            .from('sales')
            .delete()
            .eq('id', saleId);

          if (deleteError) {
            console.error('Erreur lors de la suppression de la vente:', deleteError);
            return;
          }

          const newSpentSinceLastGift = customer.spent_since_last_gift - sale.amount;
          const newTotalSpent = customer.total_spent - sale.amount;
          const newAvailableGifts = Math.floor(newSpentSinceLastGift / 150);

          // Mettre à jour le client
          const { data, error } = await supabase
            .from('customers')
            .update({
              total_spent: newTotalSpent,
              spent_since_last_gift: newSpentSinceLastGift,
              available_gifts: newAvailableGifts
            })
            .eq('id', customerId)
            .select();

          if (error) {
            console.error('Erreur lors de la mise à jour du client:', error);
          } else if (data) {
            const updatedCustomer = {
              ...data[0],
              total_spent: parseFloat(data[0].total_spent) || 0,
              spent_since_last_gift: parseFloat(data[0].spent_since_last_gift) || 0,
              sales: customer.sales.filter(s => s.id !== saleId)
            };
            setCustomers(prevCustomers =>
              prevCustomers.map(c => c.id === customerId ? updatedCustomer : c)
            );
          }
        } catch (err) {
          console.error('Erreur lors de la suppression:', err);
        }
      }
    }
  };

  const claimGift = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.available_gifts > 0) {
      const { data, error } = await supabase
        .from('customers')
        .update({
          spent_since_last_gift: customer.spent_since_last_gift - 150,
          available_gifts: customer.available_gifts - 1,
          gifts_claimed: customer.gifts_claimed + 1
        })
        .eq('id', customerId)
        .select();

      if (error) {
        console.error('Erreur lors de la réclamation du cadeau:', error);
      } else if (data) {
        setCustomers(customers.map(c => 
          c.id === customerId ? { ...data[0], sales: customer.sales } : c
        ));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          colors={['#FFD700', '#FFA500', '#ffffff']}
        />
      )}
      
      {/* Header */}
      <header className="bg-black shadow-lg border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={import.meta.env.BASE_URL + 'old-n-kush-logo.png'}
                alt="Gold N Kush Logo" 
                className="h-40 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-center text-gray-200">Gestion Fichier Client</h1>
            <button
              onClick={() => {
                console.log('Bouton Nouveau Client cliqué');
                setIsAddingCustomer(true);
              }}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-amber-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              <span>Nouveau Client</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-100"
          />
        </div>

        {/* Add Customer Form */}
        {isAddingCustomer && (
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              console.log('Formulaire soumis avec le nom:', newCustomerName);
              await addCustomer();
            }} 
            className="mb-8 bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700"
          >
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Nom du client"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-100"
                autoFocus
              />
              <button
                type="submit"
                className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustomer(false);
                  setNewCustomerName('');
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Customer List */}
        <div className="grid gap-4">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              className={`bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 ${
                customer.spent_since_last_gift >= 150 ? 'border-2 border-amber-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  {editingCustomer?.id === customer.id ? (
                    <form onSubmit={saveCustomerEdit} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingCustomer.name}
                        onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                        className="px-2 py-1 rounded bg-gray-700 border border-gray-600 text-gray-100"
                        autoFocus
                      />
                      <button type="submit" className="text-amber-500 hover:text-amber-400">
                        Sauvegarder
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(null)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-100">{customer.name}</h3>
                      <button
                        onClick={() => startEditingCustomer(customer)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Total dépensé: <span className="font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(customer.total_spent || 0)}</span>
                  </p>
                  {Number(customer.available_gifts || 0) > 0 && (
                    <p className="text-amber-500 font-semibold">
                      Cadeaux disponibles: {customer.available_gifts}
                    </p>
                  )}
                  {Number(customer.available_gifts || 0) > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => claimGift(customer.id)}
                        className="bg-amber-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-amber-700 transition-colors"
                      >
                        <Gift className="h-4 w-4" />
                        Dépenser le cadeau
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Sale Button */}
              {!showSaleForm && (
                <button
                  onClick={() => setShowSaleForm(customer.id)}
                  className="mb-4 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>Ajouter une vente</span>
                </button>
              )}

              {/* Add Sale Form */}
              {showSaleForm === customer.id && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const amount = parseFloat(newSale.amount);
                  if (!isNaN(amount) && amount > 0) {
                    addSale(customer.id, amount);
                    setNewSale({ amount: '', products: '' });
                    setShowSaleForm(null);
                  }
                }} className="mb-4 flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Montant"
                    value={newSale.amount}
                    onChange={(e) => setNewSale({ ...newSale, amount: e.target.value })}
                    className="w-32 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-100"
                  />
                  <input
                    type="text"
                    placeholder="Produits"
                    value={newSale.products}
                    onChange={(e) => setNewSale({ ...newSale, products: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-100"
                  />
                  <button
                    type="submit"
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    <span>Ajouter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaleForm(null)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    Annuler
                  </button>
                </form>
              )}

              {/* Sales History */}
              {customer.sales && customer.sales.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Historique des achats</h4>
                  <div className="space-y-2">
                    {customer.sales.map(sale => (
                      <div key={sale.id} className="text-sm bg-gray-700 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-300">{new Date(sale.date).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              <span className="font-semibold text-amber-500 text-lg">{sale.amount.toFixed(2)}€</span>
                            </div>
                            {sale.products && (
                              <div className="mt-2">
                                <p className="text-gray-300 font-medium mb-1">Produits achetés :</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-300">
                                  {typeof sale.products === 'string' 
                                    ? JSON.parse(sale.products).map((product: string, index: number) => (
                                        <li key={index} className="ml-2">{product}</li>
                                      ))
                                    : sale.products.map((product: string, index: number) => (
                                        <li key={index} className="ml-2">{product}</li>
                                      ))
                                  }
                                </ul>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteSale(customer.id, sale.id)}
                            className="text-red-500 hover:text-red-400 ml-4 p-1 rounded-full hover:bg-gray-600 transition-colors"
                            title="Supprimer cette vente"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;