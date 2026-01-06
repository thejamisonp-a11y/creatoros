import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Search, UserCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Personas() {
  const { getAuthHeaders } = useAuth();
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    try {
      const response = await axios.get(`${API}/personas`, getAuthHeaders());
      setPersonas(response.data);
    } catch (error) {
      toast.error('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (rating) => {
    if (rating >= 80) return <Badge className="badge-danger">Critical ({rating})</Badge>;
    if (rating >= 50) return <Badge className="badge-warning">Medium ({rating})</Badge>;
    return <Badge className="badge-success">Low ({rating})</Badge>;
  };

  const getPricingBadge = (tier) => {
    const colors = {
      budget: 'badge-info',
      standard: '',
      premium: 'badge-warning',
      exclusive: 'badge-danger'
    };
    return <Badge className={colors[tier] || ''} variant="outline">{tier}</Badge>;
  };

  const filteredPersonas = personas.filter(p => 
    p.persona_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.branding_tone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="personas-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Persona Registry</h1>
          <p className="text-muted-foreground mt-1">Manage talent personas and risk profiles</p>
        </div>
        <Link to="/talents">
          <Button variant="secondary" className="gap-2" data-testid="manage-talents-btn">
            <UserCircle className="h-4 w-4" />
            Manage via Talents
          </Button>
        </Link>
      </div>

      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search personas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input/50"
              data-testid="persona-search-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>All Personas ({filteredPersonas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPersonas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No personas found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona Name</TableHead>
                    <TableHead>Branding</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPersonas.map((persona) => (
                    <TableRow key={persona.id} className="data-row" data-testid={`persona-row-${persona.id}`}>
                      <TableCell className="font-medium">{persona.persona_name}</TableCell>
                      <TableCell className="text-muted-foreground">{persona.branding_tone}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {persona.allowed_platforms.slice(0, 2).map((p, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                          ))}
                          {persona.allowed_platforms.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{persona.allowed_platforms.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPricingBadge(persona.pricing_tier)}</TableCell>
                      <TableCell>{getRiskBadge(persona.risk_rating)}</TableCell>
                      <TableCell>
                        <Badge className={persona.status === 'active' ? 'badge-success' : 'badge-warning'}>
                          {persona.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-500/20">
                <UserCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Risk</p>
                <p className="text-2xl font-bold">{personas.filter(p => p.risk_rating < 50).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
                <p className="text-2xl font-bold">{personas.filter(p => p.risk_rating >= 50 && p.risk_rating < 80).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critical Risk</p>
                <p className="text-2xl font-bold">{personas.filter(p => p.risk_rating >= 80).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
