#!/usr/bin/env python3
"""lensargs — decide the lens.py arguments of a render from the film's own K.lens (read from pageinfo.json).

usage: lensargs.py <pageinfo.json> <draft|final> <force 0|1> <off 0|1> <sched_out.json>
Prints the argument string for tools/lens.py, or nothing when the render stays clean.

  K.lens = {k, ca, bloom, thr, vig, grain, bloomauto, sched: [{from, to, …}]}   the film's finish, set from the reference
  K.lens = false                                                                 always clean
  K.lens = null (default)                                                        clean, unless `katana render --lens`
Finals apply it; drafts only with --lens (speed). --nolens always wins. Missing keys fall back to the house profile:
gentle bloom and fringes, a trace of barrel, fine grain, NO vignette (add vig only when the reference has one).
A schedule is written to <sched_out.json> (removed when there is none); the CLI passes it to lens.py when the file exists.
"""
import json, os, sys

HOUSE = dict(k=.02, ca=1.0, bloom=.3, vig=0, grain=.015)
KEYS = ('k', 'ca', 'bloom', 'thr', 'vig', 'grain', 'bloomauto')


def main():
    info = json.load(open(sys.argv[1])); mode, force, off, schedp = sys.argv[2], sys.argv[3] == '1', sys.argv[4] == '1', sys.argv[5]
    if os.path.exists(schedp):
        os.remove(schedp)
    L = (info.get('cues') or {}).get('lens')
    if off or L is False or (L is None and not force) or (mode != 'final' and not force):
        return
    p = dict(HOUSE)
    if isinstance(L, dict):
        p.update({k: v for k, v in L.items() if k in KEYS})
    args = ' '.join('--%s %s' % (k, v) for k, v in p.items())
    if isinstance(L, dict) and L.get('sched'):
        json.dump(L['sched'], open(schedp, 'w'))
    print(args)


if __name__ == '__main__':
    main()
