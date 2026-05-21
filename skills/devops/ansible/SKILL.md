---
name: ansible
description: Ansible 自动化配置管理
tags: [devops, ansible, automation, configuration]
---

# Ansible 自动化技能

## 触发条件

- 服务器配置管理
- 应用部署自动化
- 基础设施编排
- 任务自动化

## 安装配置

```bash
# 安装
pip install ansible

# 目录结构
ansible/
├── inventory/
│   ├── hosts
│   └── group_vars/
├── playbooks/
│   ├── deploy.yml
│   └── setup.yml
├── roles/
│   ├── common/
│   └── webserver/
└── ansible.cfg
```

## Inventory 配置

```ini
# inventory/hosts
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com

[all:vars]
ansible_user=deploy
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

## Playbook 示例

```yaml
# playbooks/deploy.yml
---
- name: Deploy application
  hosts: webservers
  become: yes
  
  vars:
    app_version: "1.0.0"
    app_dir: /opt/myapp
    
  tasks:
    - name: Create app directory
      file:
        path: "{{ app_dir }}"
        state: directory
        owner: deploy
        group: deploy
        
    - name: Copy application files
      copy:
        src: ../dist/
        dest: "{{ app_dir }}/"
        owner: deploy
        
    - name: Install dependencies
      pip:
        requirements: "{{ app_dir }}/requirements.txt"
        
    - name: Start application
      systemd:
        name: myapp
        state: restarted
        enabled: yes
```

## Role 示例

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present
    
- name: Copy Nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/myapp
  notify: Restart Nginx
    
- name: Enable site
  file:
    src: /etc/nginx/sites-available/myapp
    dest: /etc/nginx/sites-enabled/myapp
    state: link
  notify: Restart Nginx
```

```yaml
# roles/webserver/handlers/main.yml
---
- name: Restart Nginx
  systemd:
    name: nginx
    state: restarted
```

## 常用模块

### 文件操作
```yaml
- name: Create directory
  file:
    path: /opt/app
    state: directory
    mode: '0755'

- name: Copy file
  copy:
    src: files/app.conf
    dest: /etc/app/app.conf
```

### 包管理
```yaml
- name: Install packages
  apt:
    name:
      - nginx
      - python3
      - python3-pip
    state: present
    update_cache: yes
```

### 服务管理
```yaml
- name: Start service
  systemd:
    name: myapp
    state: started
    enabled: yes
```

## 常用命令

```bash
# 运行 Playbook
ansible-playbook playbooks/deploy.yml

# 使用 Inventory
ansible-playbook -i inventory/hosts playbooks/deploy.yml

# 限制主机
ansible-playbook --limit webservers playbooks/deploy.yml

# 检查模式
ansible-playbook --check playbooks/deploy.yml

# 调试
ansible-playbook -vvv playbooks/deploy.yml
```

## 最佳实践

### 安全
- 使用 Ansible Vault 加密敏感信息
- 最小权限原则
- 审计日志

### 组织
- 使用 Roles 组织代码
- 变量分层管理
- 标签分类任务

### 测试
- 使用 Molecule 测试 Roles
- CI/CD 集成
- 幂等性验证

---

**技能版本**：v1.0
