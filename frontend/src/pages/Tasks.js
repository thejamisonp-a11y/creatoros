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
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, ListTodo, CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Tasks() {
  const { getAuthHeaders } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    persona_id: '',
    task_type: 'general',
    priority: 'medium',
    deadline: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, personasRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeaders()),
        axios.get(`${API}/personas`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setPersonas(personasRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tasks`, formData, getAuthHeaders());
      toast.success('Task created successfully');
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        persona_id: '',
        task_type: 'general',
        priority: 'medium',
        deadline: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/tasks/${taskId}/status?status=${newStatus}`, null, getAuthHeaders());
      toast.success('Task updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: 'badge-danger animate-pulse',
      high: 'badge-danger',
      medium: 'badge-warning',
      low: 'badge-info'
    };
    return <Badge className={styles[priority] || styles.medium}>{priority}</Badge>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'badge-warning',
      in_progress: 'badge-info',
      completed: 'badge-success',
      blocked: 'badge-danger'
    };
    return <Badge className={styles[status] || styles.pending}>{status?.replace('_', ' ')}</Badge>;
  };

  const getPersonaName = (personaId) => {
    if (!personaId) return null;
    const persona = personas.find(p => p.id === personaId);
    return persona?.persona_name;
  };

  const filteredTasks = filterStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterStatus);

  const groupedTasks = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
    blocked: filteredTasks.filter(t => t.status === 'blocked')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const TaskCard = ({ task }) => (
    <Card className="border-border bg-secondary/30 card-hover" data-testid={`task-card-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium line-clamp-2">{task.title}</h4>
          {getPriorityBadge(task.priority)}
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <Badge variant="outline" className="capitalize">{task.task_type?.replace('_', ' ')}</Badge>
          {getPersonaName(task.persona_id) && (
            <Badge variant="outline">{getPersonaName(task.persona_id)}</Badge>
          )}
          {task.deadline && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {task.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => handleStatusUpdate(task.id, 'in_progress')}
              data-testid={`start-task-${task.id}`}
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          )}
          {task.status === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-emerald-400"
              onClick={() => handleStatusUpdate(task.id, 'completed')}
              data-testid={`complete-task-${task.id}`}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
          {(task.status === 'pending' || task.status === 'in_progress') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400"
              onClick={() => handleStatusUpdate(task.id, 'blocked')}
              data-testid={`block-task-${task.id}`}
            >
              <AlertCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="tasks-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground mt-1">Track ops tasks linked to personas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary gap-2" data-testid="create-task-btn">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-primary" />
                New Task
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Task title"
                    required
                    className="bg-input/50"
                    data-testid="task-title-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Task details"
                    className="bg-input/50"
                    data-testid="task-description-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task_type">Task Type</Label>
                    <Select 
                      value={formData.task_type}
                      onValueChange={(value) => setFormData({...formData, task_type: value})}
                    >
                      <SelectTrigger className="bg-input/50" data-testid="task-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform_appeal">Platform Appeal</SelectItem>
                        <SelectItem value="brand_deal">Brand Deal</SelectItem>
                        <SelectItem value="crisis_response">Crisis Response</SelectItem>
                        <SelectItem value="talent_request">Talent Request</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority}
                      onValueChange={(value) => setFormData({...formData, priority: value})}
                    >
                      <SelectTrigger className="bg-input/50" data-testid="task-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona_id">Related Persona (Optional)</Label>
                  <Select 
                    value={formData.persona_id}
                    onValueChange={(value) => setFormData({...formData, persona_id: value})}
                  >
                    <SelectTrigger className="bg-input/50" data-testid="task-persona-select">
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
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    className="bg-input/50"
                    data-testid="task-deadline-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glow-primary" data-testid="task-submit-btn">
                  Create Task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'in_progress', 'completed', 'blocked'].map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? 'glow-primary' : ''}
                data-testid={`filter-${status}`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{groupedTasks.pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-blue-500/20">
                <Play className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{groupedTasks.in_progress.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{groupedTasks.completed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold">{groupedTasks.blocked.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending */}
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Pending
              <Badge variant="outline">{groupedTasks.pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedTasks.pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
            ) : (
              groupedTasks.pending.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-400" />
              In Progress
              <Badge variant="outline">{groupedTasks.in_progress.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedTasks.in_progress.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks in progress</p>
            ) : (
              groupedTasks.in_progress.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Completed
              <Badge variant="outline">{groupedTasks.completed.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedTasks.completed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No completed tasks</p>
            ) : (
              groupedTasks.completed.slice(0, 5).map(task => <TaskCard key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>

        {/* Blocked */}
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Blocked
              <Badge variant="outline">{groupedTasks.blocked.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedTasks.blocked.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No blocked tasks</p>
            ) : (
              groupedTasks.blocked.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
