/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 *
 * This file requires contract dependencies which are licensed as
 * GPL-3.0-or-later, forcing it to also be licensed as such.
 *
 * This is the only file in your project that requires this license and
 * you are free to choose a different license for the rest of the project.
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/apm/Repo.sol";
import "@aragon/os/contracts/lib/ens/ENS.sol";
import "@aragon/os/contracts/lib/ens/PublicResolver.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";

import "@aragon/apps-token-manager/contracts/TokenManager.sol";
import "@aragon/apps-shared-minime/contracts/MiniMeToken.sol";

import "./AirdropDuo.sol";


contract TemplateBase is APMNamehash {
    ENS public ens;
    DAOFactory public fac;

    event DeployDao(address dao);
    event InstalledApp(address appProxy, bytes32 appId);

    constructor(DAOFactory _fac, ENS _ens) public {
        ens = _ens;

        // If no factory is passed, get it from on-chain bare-kit
        if (address(_fac) == address(0)) {
            bytes32 bareKit = apmNamehash("bare-kit");
            fac = TemplateBase(latestVersionAppBase(bareKit)).fac();
        } else {
            fac = _fac;
        }
    }

    function latestVersionAppBase(bytes32 appId) public view returns (address base) {
        Repo repo = Repo(PublicResolver(ens.resolver(appId)).addr(appId));
        (,base,) = repo.getLatest();

        return base;
    }
}


contract Template is TemplateBase {
    MiniMeTokenFactory tokenFactory;

    uint64 constant PCT = 10 ** 16;
    address constant ANY_ENTITY = address(-1);

    constructor(ENS ens) TemplateBase(DAOFactory(0), ens) public {
        tokenFactory = new MiniMeTokenFactory();
    }

    function newInstance() public {
        Kernel dao = fac.newDAO(this);
        ACL acl = ACL(dao.acl());
        acl.createPermission(this, dao, dao.APP_MANAGER_ROLE(), this);

        address root = msg.sender;
        bytes32 airdropAppId = keccak256(abi.encodePacked(apmNamehash("open"), keccak256("airdrop-duo-app")));
        bytes32 tokenManagerAppId = apmNamehash("token-manager");

        AirdropDuo airdrop = AirdropDuo(dao.newAppInstance(airdropAppId, latestVersionAppBase(airdropAppId)));
        TokenManager contribManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));
        TokenManager currencyManager = TokenManager(dao.newAppInstance(tokenManagerAppId, latestVersionAppBase(tokenManagerAppId)));

        MiniMeToken contrib = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Contrib", 18, "CONTRIB", false);
        MiniMeToken currency = tokenFactory.createCloneToken(MiniMeToken(0), 0, "Currency", 18, "CURRENCY", true);
        contrib.changeController(contribManager);
        currency.changeController(currencyManager);

        // Initialize apps
        contribManager.initialize(contrib, false, 0);
        emit InstalledApp(contribManager, tokenManagerAppId);
        currencyManager.initialize(currency, true, 0);
        emit InstalledApp(currencyManager, tokenManagerAppId);
        airdrop.initialize(contribManager, currencyManager);
        emit InstalledApp(airdrop, airdropAppId);

        acl.createPermission(root, contribManager, contribManager.BURN_ROLE(), root);
        acl.createPermission(root, currencyManager, currencyManager.BURN_ROLE(), root);
        acl.createPermission(root, airdrop, airdrop.START_ROLE(), root);
        acl.createPermission(this, contribManager, contribManager.MINT_ROLE(), this);
        acl.createPermission(this, currencyManager, currencyManager.MINT_ROLE(), this);

        contribManager.mint(root, 100000 * 10**18); // Give 1 token to each holder
        currencyManager.mint(root, 100000 * 10**18); // Give 1 token to each holder

        // Clean up permissions

        acl.grantPermission(airdrop, contribManager, contribManager.MINT_ROLE());
        acl.revokePermission(this, contribManager, contribManager.MINT_ROLE());
        acl.setPermissionManager(root, contribManager, contribManager.MINT_ROLE());

        acl.grantPermission(airdrop, currencyManager, currencyManager.MINT_ROLE());
        acl.revokePermission(this, currencyManager, currencyManager.MINT_ROLE());
        acl.setPermissionManager(root, currencyManager, currencyManager.MINT_ROLE());

        acl.grantPermission(root, dao, dao.APP_MANAGER_ROLE());
        acl.revokePermission(this, dao, dao.APP_MANAGER_ROLE());
        acl.setPermissionManager(root, dao, dao.APP_MANAGER_ROLE());

        acl.grantPermission(root, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.revokePermission(this, acl, acl.CREATE_PERMISSIONS_ROLE());
        acl.setPermissionManager(root, acl, acl.CREATE_PERMISSIONS_ROLE());

        emit DeployDao(dao);
    }

}
