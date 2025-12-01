import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';
const STORAGE_KEY_GROUPS = 'sidebar-expanded-groups';
const MOBILE_BREAKPOINT = 768;

interface SidebarContextType {
  isCollapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  expandedGroups: string[];
  toggleGroup: (groupId: string) => void;
  isGroupExpanded: (groupId: string) => boolean;
  isMobile: boolean;
  isMobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 从 localStorage 读取初始状态
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COLLAPSED);
    return stored ? JSON.parse(stored) : false;
  });

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_GROUPS);
    // 默认展开第一个分组 (core)
    return stored ? JSON.parse(stored) : ['core'];
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  // 响应式检测
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端时关闭侧边栏
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  // 持久化 isCollapsed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // 持久化 expandedGroups
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const setCollapsed = useCallback((value: boolean) => {
    setIsCollapsed(value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev: boolean) => !prev);
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev: string[]) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      }
      return [...prev, groupId];
    });
  }, []);

  const isGroupExpanded = useCallback(
    (groupId: string) => expandedGroups.includes(groupId),
    [expandedGroups]
  );

  const value: SidebarContextType = {
    isCollapsed,
    setCollapsed,
    toggleCollapsed,
    expandedGroups,
    toggleGroup,
    isGroupExpanded,
    isMobile,
    isMobileOpen,
    setMobileOpen,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
