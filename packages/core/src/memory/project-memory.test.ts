/**
 * ProjectMemory 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ProjectMemory } from './project-memory.js';

describe('ProjectMemory', () => {
  let db: Database.Database;
  let memory: ProjectMemory;

  beforeEach(() => {
    db = new Database(':memory:');
    memory = new ProjectMemory(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('CRUD', () => {
    it('应存储和获取记忆条目', () => {
      memory.store('doc-1', '这是文档内容', { type: 'markdown' });
      const entry = memory.get('doc-1');
      expect(entry).toBeTruthy();
      expect(entry?.key).toBe('doc-1');
      expect(entry?.value).toBe('这是文档内容');
      expect(entry?.version).toBe(1);
    });

    it('应更新已有条目并递增版本', () => {
      memory.store('doc-1', '版本1');
      memory.store('doc-1', '版本2');
      memory.store('doc-1', '版本3');

      const entry = memory.get('doc-1');
      expect(entry?.value).toBe('版本3');
      expect(entry?.version).toBe(3);
    });

    it('应删除条目', () => {
      memory.store('doc-1', '内容');
      expect(memory.delete('doc-1')).toBe(true);
      expect(memory.get('doc-1')).toBeNull();
    });

    it('应获取条目数量', () => {
      memory.store('a', '1');
      memory.store('b', '2');
      expect(memory.count()).toBe(2);
    });
  });

  describe('版本历史', () => {
    it('应保存历史版本', () => {
      memory.store('doc-1', '版本1');
      memory.store('doc-1', '版本2');
      memory.store('doc-1', '版本3');

      const versions = memory.getVersions('doc-1');
      expect(versions.length).toBe(2); // 版本1和版本2被保存
      expect(versions[0].value).toBe('版本1');
      expect(versions[0].version).toBe(1);
      expect(versions[1].value).toBe('版本2');
      expect(versions[1].version).toBe(2);
    });
  });

  describe('查询', () => {
    it('应按 key 查询', () => {
      memory.store('doc-a', 'A');
      memory.store('doc-b', 'B');
      memory.store('doc-c', 'C');

      const results = memory.query({ key: 'doc-b' });
      expect(results.length).toBe(1);
      expect(results[0].key).toBe('doc-b');
    });

    it('应支持 LIKE 搜索', () => {
      memory.store('react-guide', 'React 最佳实践');
      memory.store('vue-guide', 'Vue 开发指南');
      memory.store('docker-guide', 'Docker 部署');

      const results = memory.query({ search: 'guide' });
      expect(results.length).toBe(3);
    });

    it('应支持分页', () => {
      for (let i = 0; i < 10; i++) {
        memory.store(`doc-${i}`, `内容 ${i}`);
      }

      const page1 = memory.query({ limit: 3, offset: 0 });
      const page2 = memory.query({ limit: 3, offset: 3 });
      expect(page1.length).toBe(3);
      expect(page2.length).toBe(3);
      expect(page1[0].key).not.toBe(page2[0].key);
    });
  });

  describe('上下文注入', () => {
    it('应构建上下文文本', () => {
      memory.store('project-name', 'DEV-Agent-Teams');
      memory.store('project-version', 'v0.3.0');

      const context = memory.buildContext();
      expect(context).toContain('## 项目记忆');
      expect(context).toContain('project-name');
      expect(context).toContain('DEV-Agent-Teams');
    });

    it('应按指定 key 构建上下文', () => {
      memory.store('a', 'A内容');
      memory.store('b', 'B内容');
      memory.store('c', 'C内容');

      const context = memory.buildContext(['a', 'c']);
      expect(context).toContain('A内容');
      expect(context).toContain('C内容');
      expect(context).not.toContain('B内容');
    });

    it('无条目时返回空字符串', () => {
      expect(memory.buildContext()).toBe('');
    });
  });
});
