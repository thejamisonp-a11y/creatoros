import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Lock,
  Shield,
  UserCircle,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TalentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [talent, setTalent] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
  const [personaForm, setPersonaForm] = useState({
    persona_name: '',
    branding_tone: '',
    niche_tags: '',
    allowed_platforms: '',
    prohibited_acts: '',
    pricing_tier: 'standard',
    risk_rating: 0
  });

  useEffect(() => {
    fetchTalentData();
  }, [id]);

  const fetchTalentData = async () => {
    try {
      const [talentRes, personasRes, onboardingRes] = await Promise.all([
        axios.get(`${API}/talents/${id}`, getAuthHeaders()),
        axios.get(`${API}/personas?talent_id=${id}`, getAuthHeaders()),
        axios.get(`${API}/onboarding/${id}`, getAuthHeaders())
      ]);
      setTalent(talentRes.data);
      setPersonas(personasRes.data);
      setOnboarding(onboardingRes.data);
    } catch (error) {
      toast.error('Failed to load talent data');
      navigate('/talents');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStep = async (stepId) => {
    try {
      await axios.put(`${API}/onboarding/${id}/step/${stepId}`, null, getAuthHeaders());
      toast.success('Step completed');
      fetchTalentData();
    } catch (error) {
      toast.error('Failed to complete step');
    }
  };

  const handleCreatePersona = async (e) => {
    e.preventDefault();
    try {
      const data = {
        talent_id: id,
        persona_name: personaForm.persona_name,
        branding_tone: personaForm.branding_tone,
        niche_tags: personaForm.niche_tags.split(',').map(s => s.trim()).filter(Boolean),
        allowed_platforms: personaForm.allowed_platforms.split(',').map(s => s.trim()).filter(Boolean),
        prohibited_acts: personaForm.prohibited_acts.split(',').map(s => s.trim()).filter(Boolean),
        pricing_tier: personaForm.pricing_tier,
        risk_rating: parseInt(personaForm.risk_rating)
      };
      await axios.post(`${API}/personas`, data, getAuthHeaders());
      toast.success('Persona created');
      setIsPersonaDialogOpen(false);
      setPersonaForm({
        persona_name: '',
        branding_tone: '',
        niche_tags: '',
        allowed_platforms: '',
        prohibited_acts: '',
        pricing_tier: 'standard',
        risk_rating: 0
      });
      fetchTalentData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create persona');
    }
  };

  const handleDeleteTalent = async () => {
    if (!window.confirm('Are you sure? This will delete the talent and all associated personas.')) return;
    
    try {
      await axios.delete(`${API}/talents/${id}`, getAuthHeaders());
      toast.success('Talent deleted');
      navigate('/talents');
    } catch (error) {
      toast.error('Failed to delete talent');
    }
  };

  const getRiskBadge = (rating) => {
    if (rating >= 80) return <Badge className="badge-danger">Critical Risk</Badge>;
    if (rating >= 50) return <Badge className="badge-warning">Medium Risk</Badge>;
    return <Badge className="badge-success">Low Risk</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="talent-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/talents">
          <Button variant="ghost" size="icon" data-testid="back-btn">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-mono">{talent?.display_id}</h1>
          <p className="text-muted-foreground mt-1">Talent Profile & Management</p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDeleteTalent} data-testid="delete-talent-btn">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className={
              talent?.verification_status === 'verified' ? 'badge-success' :
              talent?.verification_status === 'pending' ? 'badge-warning' : 'badge-danger'
            }>
              {talent?.verification_status}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Readiness Score</p>
            <p className="text-2xl font-bold">{talent?.readiness_score}%</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Personas</p>
            <p className="text-2xl font-bold">{personas.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Onboarding</p>
            <Badge className={talent?.onboarding_complete ? 'badge-success' : 'badge-warning'}>
              {talent?.onboarding_complete ? 'Complete' : 'In Progress'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="encrypted" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="encrypted" data-testid="tab-encrypted">
            <Lock className="h-4 w-4 mr-2" />
            Encrypted Data
          </TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-onboarding">
            <CheckCircle className="h-4 w-4 mr-2" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="personas" data-testid="tab-personas">
            <UserCircle className="h-4 w-4 mr-2" />
            Personas
          </TabsTrigger>
        </TabsList>

        {/* Encrypted Data Tab */}
        <TabsContent value="encrypted">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Encrypted Legal Identity
              </CardTitle>
              <CardDescription>
                This data is encrypted at rest and only visible to authorized personnel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Legal Name</p>
                  <p className="font-medium" data-testid="encrypted-legal-name">{talent?.legal_name}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                  <p className="font-medium" data-testid="encrypted-dob">{talent?.dob}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Emergency Contact</p>
                  <p className="font-medium" data-testid="encrypted-emergency">{talent?.emergency_contact || 'Not provided'}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                  <p className="font-medium" data-testid="talent-notes">{talent?.notes || 'No notes'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding">
          <Card className="border-border bg-card/50">
            <CardHeader>
              <CardTitle>Onboarding Progress</CardTitle>
              <CardDescription>
                Each step is timestamped and immutable once completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={onboarding?.overall_progress || 0} className="h-2" />
              <p className="text-sm text-muted-foreground text-right">
                {onboarding?.overall_progress || 0}% Complete
              </p>
              
              <div className="space-y-3">
                {onboarding?.steps?.map((step, index) => (
                  <div 
                    key={step.step_id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                      step.completed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-secondary/50 border border-border'
                    }`}
                    data-testid={`onboarding-step-${step.step_id}`}
                  >
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{step.name}</p>
                      {step.completed && step.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed: {new Date(step.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {!step.completed && (
                      <Button 
                        size="sm" 
                        onClick={() => handleCompleteStep(step.step_id)}
                        data-testid={`complete-step-${step.step_id}`}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personas Tab */}
        <TabsContent value="personas">
          <Card className="border-border bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personas ({personas.length})</CardTitle>
                <CardDescription>Manage talent personas and their configurations</CardDescription>
              </div>
              <Dialog open={isPersonaDialogOpen} onOpenChange={setIsPersonaDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="glow-primary gap-2" data-testid="add-persona-btn">
                    <Plus className="h-4 w-4" />
                    Add Persona
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Persona</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePersona}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="persona_name">Persona Name</Label>
                        <Input
                          id="persona_name"
                          value={personaForm.persona_name}
                          onChange={(e) => setPersonaForm({...personaForm, persona_name: e.target.value})}
                          required
                          className="bg-input/50"
                          data-testid="persona-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branding_tone">Branding Tone</Label>
                        <Input
                          id="branding_tone"
                          value={personaForm.branding_tone}
                          onChange={(e) => setPersonaForm({...personaForm, branding_tone: e.target.value})}
                          placeholder="e.g., Playful, Edgy, Sophisticated"
                          className="bg-input/50"
                          data-testid="persona-branding-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="niche_tags">Niche Tags (comma-separated)</Label>
                        <Input
                          id="niche_tags"
                          value={personaForm.niche_tags}
                          onChange={(e) => setPersonaForm({...personaForm, niche_tags: e.target.value})}
                          placeholder="e.g., fitness, lifestyle, glamour"
                          className="bg-input/50"
                          data-testid="persona-tags-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allowed_platforms">Allowed Platforms (comma-separated)</Label>
                        <Input
                          id="allowed_platforms"
                          value={personaForm.allowed_platforms}
                          onChange={(e) => setPersonaForm({...personaForm, allowed_platforms: e.target.value})}
                          placeholder="e.g., OnlyFans, Fansly, Instagram"
                          className="bg-input/50"
                          data-testid="persona-platforms-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prohibited_acts">Prohibited Acts (comma-separated)</Label>
                        <Textarea
                          id="prohibited_acts"
                          value={personaForm.prohibited_acts}
                          onChange={(e) => setPersonaForm({...personaForm, prohibited_acts: e.target.value})}
                          placeholder="List any prohibited activities or content types"
                          className="bg-input/50"
                          data-testid="persona-prohibited-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pricing_tier">Pricing Tier</Label>
                          <Select 
                            value={personaForm.pricing_tier}
                            onValueChange={(value) => setPersonaForm({...personaForm, pricing_tier: value})}
                          >
                            <SelectTrigger className="bg-input/50" data-testid="persona-pricing-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="budget">Budget</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="exclusive">Exclusive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="risk_rating">Risk Rating (0-100)</Label>
                          <Input
                            id="risk_rating"
                            type="number"
                            min="0"
                            max="100"
                            value={personaForm.risk_rating}
                            onChange={(e) => setPersonaForm({...personaForm, risk_rating: e.target.value})}
                            className="bg-input/50"
                            data-testid="persona-risk-input"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setIsPersonaDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="glow-primary" data-testid="persona-submit-btn">
                        Create Persona
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {personas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No personas yet. Create a persona to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personas.map((persona) => (
                    <Card key={persona.id} className="border-border bg-secondary/30" data-testid={`persona-card-${persona.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{persona.persona_name}</h3>
                            <p className="text-sm text-muted-foreground">{persona.branding_tone}</p>
                          </div>
                          {getRiskBadge(persona.risk_rating)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Platforms: </span>
                            {persona.allowed_platforms.join(', ') || 'None specified'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pricing: </span>
                            <span className="capitalize">{persona.pricing_tier}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tags: </span>
                            {persona.niche_tags.length > 0 ? (
                              <span className="flex flex-wrap gap-1 mt-1">
                                {persona.niche_tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </span>
                            ) : 'No tags'}
                          </div>
                          {persona.prohibited_acts.length > 0 && (
                            <div className="flex items-start gap-1 text-red-400">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{persona.prohibited_acts.length} prohibited acts defined</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
