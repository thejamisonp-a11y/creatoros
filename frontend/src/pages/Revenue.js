import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Revenue() {
  const { getAuthHeaders } = useAuth();
  const [revenues, setRevenues] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    persona_id: '',
    platform: '',
    amount: '',
    currency: 'USD',
    revenue_type: 'subscription',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [revenuesRes, personasRes, summaryRes] = await Promise.all([
        axios.get(`${API}/revenue`, getAuthHeaders()),
        axios.get(`${API}/personas`, getAuthHeaders()),
        axios.get(`${API}/revenue/summary`, getAuthHeaders())
      ]);
      setRevenues(revenuesRes.data);
      setPersonas(personasRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/revenue`, {
        ...formData,
        amount: parseFloat(formData.amount)
      }, getAuthHeaders());
      toast.success('Revenue recorded successfully');
      setIsDialogOpen(false);
      setFormData({
        persona_id: '',
        platform: '',
        amount: '',
        currency: 'USD',
        revenue_type: 'subscription',
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record revenue');
    }
  };

  const getPersonaName = (personaId) => {
    const persona = personas.find(p => p.id === personaId);
    return persona?.persona_name || 'Unknown';
  };

  const getTypeColor = (type) => {
    const colors = {
      subscription: 'text-blue-400',
      ppv: 'text-purple-400',
      tips: 'text-amber-400',
      custom: 'text-emerald-400',
      experience: 'text-pink-400'
    };
    return colors[type] || 'text-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="revenue-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Revenue Control Center</h1>
          <p className="text-muted-foreground mt-1">Track income by persona and platform</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary gap-2" data-testid="add-revenue-btn">
              <Plus className="h-4 w-4" />
              Record Revenue
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                New Revenue Entry
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="persona_id">Persona</Label>
                  <Select 
                    value={formData.persona_id}
                    onValueChange={(value) => setFormData({...formData, persona_id: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="revenue-persona-select">
                      <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.persona_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Input
                    id="platform"
                    value={formData.platform}
                    onChange={(e) => setFormData({...formData, platform: e.target.value})}
                    placeholder="e.g., OnlyFans, Fansly, Custom"
                    required
                    className="bg-input/50"
                    data-testid="revenue-platform-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                      className="bg-input/50"
                      data-testid="revenue-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={formData.currency}
                      onValueChange={(value) => setFormData({...formData, currency: value})}
                    >
                      <SelectTrigger className="bg-input/50" data-testid="revenue-currency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revenue_type">Revenue Type</Label>
                  <Select 
                    value={formData.revenue_type}
                    onValueChange={(value) => setFormData({...formData, revenue_type: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="revenue-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="ppv">Pay-Per-View</SelectItem>
                      <SelectItem value="tips">Tips</SelectItem>
                      <SelectItem value="custom">Custom Content</SelectItem>
                      <SelectItem value="experience">Experience/Escort</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional context"
                    className="bg-input/50"
                    data-testid="revenue-notes-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glow-primary" data-testid="revenue-submit-btn">
                  Record Revenue
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50 md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Month-to-Date Revenue</p>
                <p className="text-4xl font-bold text-emerald-400">
                  ${summary?.total_mtd?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-3xl font-bold">{revenues.length}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Active Platforms</p>
            <p className="text-3xl font-bold">
              {Object.keys(summary?.by_platform || {}).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Platform & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              By Platform (MTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(summary?.by_platform || {}).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary?.by_platform || {}).map(([platform, amount]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="font-medium">{platform}</span>
                    <span className="text-emerald-400 font-mono">${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              By Type (MTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(summary?.by_type || {}).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(summary?.by_type || {}).map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className={`font-medium capitalize ${getTypeColor(type)}`}>{type}</span>
                    <span className="text-emerald-400 font-mono">${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Recent Revenue Entries</CardTitle>
          <CardDescription>Latest recorded transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {revenues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No revenue entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.slice(0, 10).map((rev) => (
                    <TableRow key={rev.id} className="data-row" data-testid={`revenue-row-${rev.id}`}>
                      <TableCell className="font-medium">{getPersonaName(rev.persona_id)}</TableCell>
                      <TableCell>{rev.platform}</TableCell>
                      <TableCell className={`capitalize ${getTypeColor(rev.revenue_type)}`}>
                        {rev.revenue_type}
                      </TableCell>
                      <TableCell className="font-mono text-emerald-400">
                        ${rev.amount.toLocaleString()} {rev.currency}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(rev.recorded_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
