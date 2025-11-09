/**
 * 关系网络可视化图谱
 * 使用SVG绘制关系网络
 */

import { useEffect, useRef, useState } from 'react';
import { CharacterRelationship } from '../utils/aiRelationships';

interface Node {
  id: string;
  name: string;
  avatar?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCenter?: boolean;
}

interface Link {
  source: string;
  target: string;
  affection: number;
  status: string;
}

interface RelationshipGraphProps {
  centerCharacter: {
    id: string;
    name: string;
    avatar?: string;
  };
  relationships: CharacterRelationship[];
  onNodeClick?: (nodeId: string) => void;
}

export default function RelationshipGraph({ centerCharacter, relationships, onNodeClick }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();

  const width = 600;
  const height = 500;

  // 初始化节点和连线
  useEffect(() => {
    const centerNode: Node = {
      id: centerCharacter.id,
      name: centerCharacter.name,
      avatar: centerCharacter.avatar,
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      isCenter: true
    };

    const relationshipNodes: Node[] = relationships.map((rel, index) => {
      const angle = (index / relationships.length) * Math.PI * 2;
      const radius = 150;
      return {
        id: rel.id,
        name: rel.type === 'contact' ? (rel.contactName || '联系人') : (rel.virtualName || '虚拟角色'),
        avatar: rel.type === 'contact' ? rel.contactAvatar : undefined,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    });

    const allNodes = [centerNode, ...relationshipNodes];
    
    const allLinks: Link[] = relationships.map(rel => ({
      source: centerCharacter.id,
      target: rel.id,
      affection: rel.affectionLevel,
      status: rel.status
    }));

    setNodes(allNodes);
    setLinks(allLinks);

    // 启动物理模拟
    startSimulation(allNodes, allLinks);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [centerCharacter, relationships]);

  // 力导向布局模拟
  const startSimulation = (initialNodes: Node[], initialLinks: Link[]) => {
    let currentNodes = [...initialNodes];
    
    const simulate = () => {
      // 应用力
      currentNodes.forEach(node => {
        if (node.isCenter) return; // 中心节点不移动

        // 1. 斥力 - 节点之间互相排斥
        currentNodes.forEach(other => {
          if (node.id === other.id) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulsion = 500 / (distance * distance);
          node.vx += (dx / distance) * repulsion;
          node.vy += (dy / distance) * repulsion;
        });

        // 2. 引力 - 连线的节点互相吸引
        initialLinks.forEach(link => {
          if (link.source === node.id || link.target === node.id) {
            const other = currentNodes.find(n => 
              n.id === (link.source === node.id ? link.target : link.source)
            );
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;
              const attraction = distance * 0.01;
              node.vx += (dx / distance) * attraction;
              node.vy += (dy / distance) * attraction;
            }
          }
        });

        // 3. 向中心的力
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.002;
        node.vy += dy * 0.002;

        // 阻尼
        node.vx *= 0.8;
        node.vy *= 0.8;

        // 更新位置
        node.x += node.vx;
        node.y += node.vy;

        // 边界限制
        const padding = 60;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
      });

      setNodes([...currentNodes]);

      // 继续模拟
      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    if (onNodeClick && nodeId !== centerCharacter.id) {
      onNodeClick(nodeId);
    }
  };

  // 获取连线的颜色（基于好感度）
  const getLinkColor = (affection: number) => {
    if (affection >= 70) return '#ec4899'; // pink
    if (affection >= 50) return '#3b82f6'; // blue
    if (affection >= 30) return '#10b981'; // green
    return '#f59e0b'; // orange
  };

  // 获取连线宽度（基于好感度）
  const getLinkWidth = (affection: number) => {
    return 1 + (affection / 100) * 3;
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        style={{ maxHeight: '500px' }}
      >
        {/* 定义渐变和滤镜 */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
          </linearGradient>
        </defs>

        {/* 绘制连线 */}
        <g className="links">
          {links.map((link, index) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <g key={index}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={getLinkColor(link.affection)}
                  strokeWidth={getLinkWidth(link.affection)}
                  strokeOpacity={0.6}
                  className="transition-all duration-300"
                  style={{
                    filter: selectedNode === targetNode.id ? 'url(#glow)' : 'none'
                  }}
                />
                {/* 好感度标签 */}
                <text
                  x={(sourceNode.x + targetNode.x) / 2}
                  y={(sourceNode.y + targetNode.y) / 2}
                  fill="white"
                  fontSize="12"
                  textAnchor="middle"
                  className="pointer-events-none"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {link.affection}
                </text>
              </g>
            );
          })}
        </g>

        {/* 绘制节点 */}
        <g className="nodes">
          {nodes.map(node => {
            const isSelected = selectedNode === node.id;
            const nodeSize = node.isCenter ? 50 : 40;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer transition-transform hover:scale-110"
                style={{
                  filter: isSelected || node.isCenter ? 'url(#glow)' : 'none'
                }}
              >
                {/* 外圈光晕 */}
                {(isSelected || node.isCenter) && (
                  <circle
                    r={nodeSize / 2 + 8}
                    fill="url(#linkGradient)"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                )}

                {/* 节点背景 */}
                <circle
                  r={nodeSize / 2}
                  fill={node.isCenter ? '#8b5cf6' : '#6366f1'}
                  stroke="white"
                  strokeWidth="3"
                  className="transition-all duration-300"
                />

                {/* 头像或文字 */}
                {node.avatar ? (
                  <image
                    href={node.avatar}
                    x={-nodeSize / 2}
                    y={-nodeSize / 2}
                    width={nodeSize}
                    height={nodeSize}
                    clipPath="circle()"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    fill="white"
                    fontSize="20"
                    fontWeight="bold"
                  >
                    {node.name.charAt(0)}
                  </text>
                )}

                {/* 名称标签 */}
                <text
                  y={nodeSize / 2 + 16}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                  className="pointer-events-none"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {node.name.length > 6 ? node.name.substring(0, 6) + '...' : node.name}
                </text>

                {/* 中心标记 */}
                {node.isCenter && (
                  <text
                    y={nodeSize / 2 + 30}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="10"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    ⭐
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs space-y-1">
        <div className="font-semibold mb-2">关系强度</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-pink-500"></div>
          <span>≥70 亲密</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500"></div>
          <span>50-69 友好</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500"></div>
          <span>30-49 普通</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-orange-500"></div>
          <span>&lt;30 冷淡</span>
        </div>
      </div>

      {/* 提示 */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
        💡 点击节点查看详情
      </div>
    </div>
  );
}
