'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Edit, Trash2, Key, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth, postWithAuth, putWithAuth, deleteWithAuth } from '@/lib/fetch-with-auth';

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'user'
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      
      const data = await getWithAuth<{ success: boolean; users: User[] }>(`/api/users?${params}`);
      
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        role: 'user'
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.username || !formData.name || !formData.role) {
        toast.error('请填写必填项');
        return;
      }

      if (!editingUser && !formData.password) {
        toast.error('请输入密码');
        return;
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const body = editingUser 
        ? {
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role
          }
        : formData;

      const data = editingUser 
        ? await putWithAuth<{ success: boolean; message?: string }>(url, body)
        : await postWithAuth<{ success: boolean; message?: string }>(url, body);
      
      if (data.success) {
        toast.success(editingUser ? '用户更新成功' : '用户创建成功');
        setDialogOpen(false);
        fetchUsers();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('操作失败');
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    
    try {
      const data = await deleteWithAuth<{ success: boolean; message?: string }>(`/api/users/${deletingUser.id}`);
      
      if (data.success) {
        toast.success('用户删除成功');
        setDeleteDialogOpen(false);
        fetchUsers();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败');
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUser || !newPassword) return;
    
    try {
      const data = await postWithAuth<{ success: boolean; message?: string }>(`/api/users/${resettingUser.id}/reset-password`, { newPassword });
      
      if (data.success) {
        toast.success('密码重置成功');
        setResetPasswordDialogOpen(false);
        setNewPassword('');
      } else {
        toast.error(data.message || '重置失败');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('重置失败');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      admin: '管理员',
      manager: '经理',
      user: '普通用户'
    };
    return <Badge className={styles[role as keyof typeof styles]}>{labels[role as keyof typeof labels]}</Badge>;
  };

  // 检查权限 - 需要先等待加载完成
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">您没有权限访问此页面</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
              <Users className="mr-2 h-8 w-8" />
              用户管理
            </h1>
            <p className="text-gray-600 mt-1">管理系统用户账号和权限</p>
          </div>
          
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            新增用户
          </Button>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索用户名、姓名或邮箱..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="全部角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="manager">经理</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 用户列表 - 桌面端表格 */}
        <Card className="hidden lg:block">
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无用户数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login_at 
                          ? new Date(user.last_login_at).toLocaleString('zh-CN')
                          : '从未登录'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setResettingUser(user);
                              setResetPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDeletingUser(user);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 用户列表 - 移动端卡片 */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无用户数据</div>
          ) : (
            users.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">邮箱：</span>
                      <span>{user.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">电话：</span>
                      <span>{user.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">状态：</span>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? '启用' : '禁用'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setResettingUser(user);
                        setResetPasswordDialogOpen(true);
                      }}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      重置密码
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDeletingUser(user);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 新增/编辑用户对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? '编辑用户' : '新增用户'}</DialogTitle>
            <DialogDescription>
              {editingUser ? '修改用户信息' : '创建新的系统用户'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="请输入用户名"
              />
            </div>
            
            {!editingUser && (
              <div>
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="请输入密码"
                />
                <p className="text-xs text-gray-500 mt-1">
                  密码要求：至少8位，包含大写字母、小写字母、数字和特殊符号，不能有连续字符
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">电话</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入电话"
              />
            </div>
            
            <div>
              <Label htmlFor="role">角色 *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="manager">经理</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              为用户 <strong>{resettingUser?.name}</strong> 设置新密码
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">新密码 *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
              />
              <p className="text-xs text-gray-500 mt-1">
                密码要求：至少8位，包含大写字母、小写字母、数字和特殊符号
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordDialogOpen(false);
              setNewPassword('');
            }}>
              取消
            </Button>
            <Button onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 8}>
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户 <strong>{deletingUser?.name}</strong> 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
