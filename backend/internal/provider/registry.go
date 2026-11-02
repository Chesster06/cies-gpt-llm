package provider

import (
	"fmt"
	"sync"
)

type Registry struct {
	mu        sync.RWMutex
	providers map[string]AIProvider
}

func NewRegistry() *Registry {
	return &Registry{
		providers: make(map[string]AIProvider),
	}
}

func (r *Registry) Register(p AIProvider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers[p.ID()] = p
}

func (r *Registry) Get(id string) (AIProvider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.providers[id]
	if !ok {
		return nil, fmt.Errorf("provider '%s' not registered", id)
	}
	return p, nil
}

func (r *Registry) GetAll() []AIProvider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []AIProvider
	for _, p := range r.providers {
		list = append(list, p)
	}
	return list
}
